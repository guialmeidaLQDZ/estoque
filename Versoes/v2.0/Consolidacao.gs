/**
 * ============================================================
 * LIQUIDZ — CONSOLIDAÇÃO.gs — Projeto v1.5
 * Função: Varre os 5 CDs e consolida saldos na BASE_PRODUTOS
 * ============================================================
 *
 * Changelog v1.1:
 * [BUG-01] getActiveSpreadsheet() substituído por openById()
 * [TESTE]  IDs lidos via getIdPlanilha() — suporta ambiente producao/teste
 *
 * Changelog v1.5:
 * [FEAT-10] atualizarImpactoEstoque() — calcula e grava coluna real
 *           Impacto_Estoque em SOLICITACOES_ITENS após cada consolidação.
 */

// Palavras que indicam linha de cabeçalho — devem ser ignoradas
const CABECALHOS_IGNORADOS = ["código", "sku", "item", "produto", "nome", "cod", "ref"];

// ── Função principal ──────────────────────────────────────────────────────────
function consolidarSaldosCDs() {
  const CDS = [
    {
      id: getIdPlanilha("CD_ESCRITORIO"),
      local: "Escritório",
      colIndex: 1,
      abasAceitas: ["Dash", "CONTROLE", "CONTROLE "],
      linhaInicio: 0
    },
    {
      id: getIdPlanilha("CD_RIO"),
      local: "Rio",
      colIndex: 2,
      abasAceitas: ["Dash", "CONTROLE", "CONTROLE "],
      linhaInicio: 0
    },
    {
      id: getIdPlanilha("CD_GALP_EVENTOS"),
      local: "Galpão Eventos",
      colIndex: 3,
      abasAceitas: ["Dash", "CONTAGEM ATUALIZADA GOODSTORAGE", "CONTROLE", "CONTROLE "],
      linhaInicio: 0
    },
    {
      id: getIdPlanilha("CD_GALP_VAREJO"),
      local: "Galpão Varejo",
      colIndex: 4,
      abasAceitas: ["Dash", "CONTROLE", "CONTROLE "],
      linhaInicio: 0
    },
    {
      id: getIdPlanilha("CD_RIO_VAREJO"),
      local: "Rio Varejo",
      colIndex: 5,
      abasAceitas: ["Dash"],   // Saldo real está na Dash. CONTROLE tem apenas saídas — não usar.
      linhaInicio: 3           // Linhas 1-3 são header. Dados começam na linha 4 (índice 3).
    }
  ];

  console.log("🌍 Ambiente: " + getAmbiente());

  const ss     = SpreadsheetApp.openById(getIdPlanilha("MASTER"));
  const shBase = ss.getSheetByName("BASE_PRODUTOS");
  if (!shBase) {
    console.error("❌ Aba BASE_PRODUTOS não encontrada.");
    return;
  }

  let inventarioMaster = {};
  let relatorio = { sucesso: [], falha: [] };

  // ── Etapa 1: varre cada CD ────────────────────────────────────────────────
  CDS.forEach((cd) => {
    try {
      const ssCD = SpreadsheetApp.openById(cd.id);
      const shCD = _abrirAba(ssCD, cd.abasAceitas);

      if (!shCD) {
        console.warn("⚠️ Nenhuma aba encontrada para o CD: " + cd.local);
        relatorio.falha.push(cd.local + " (aba não encontrada)");
        return;
      }

      const dadosCD = shCD.getDataRange().getValues();
      let linhasProcessadas = 0;

      for (let j = cd.linhaInicio; j < dadosCD.length; j++) {
        const linha  = dadosCD[j];
        const skuRaw = linha[1] || linha[0] || "";
        const sku    = _normalizarSKU(skuRaw);

        if (!sku || _ehCabecalho(sku) || _skuInvalido(sku)) continue;

        const nome = (linha[2] || linha[1] || "Sem Nome").toString().trim();
        const qtd  = _parseQtd(linha[3]) ?? _parseQtd(linha[2]) ?? 0;

        if (!inventarioMaster[sku]) {
          inventarioMaster[sku] = [nome, 0, 0, 0, 0, 0];
        }
        inventarioMaster[sku][cd.colIndex] = qtd;
        linhasProcessadas++;
      }

      console.log("✅ " + cd.local + ": " + linhasProcessadas + " SKUs consolidados.");
      relatorio.sucesso.push(cd.local + " (" + linhasProcessadas + " SKUs)");

    } catch (e) {
      console.error("❌ Erro ao acessar CD " + cd.local + ": " + e.message);
      relatorio.falha.push(cd.local + " (" + e.message + ")");
    }
  });

  // ── Etapa 2: grava em batch atômico na BASE_PRODUTOS ─────────────────────
  const skusOrdenados = Object.keys(inventarioMaster).sort();
  const outputFinal   = skusOrdenados.map((sku) => {
    const d     = inventarioMaster[sku];
    const total = d[1] + d[2] + d[3] + d[4] + d[5];
    return [sku, d[0], d[1], d[2], d[3], d[4], d[5], total, new Date()];
  });

  if (outputFinal.length > 0) {
    const ultimaLinha = shBase.getLastRow();
    if (ultimaLinha > 1) shBase.getRange(2, 1, ultimaLinha - 1, 9).clearContent();
    shBase.getRange(2, 1, outputFinal.length, 9).setValues(outputFinal);
    SpreadsheetApp.flush();
  }

  console.log("──────────────────────────────────");
  console.log("CONSOLIDAÇÃO CONCLUÍDA");
  console.log("Total de SKUs únicos: " + skusOrdenados.length);
  console.log("CDs com sucesso: " + relatorio.sucesso.join(" | "));
  if (relatorio.falha.length > 0) console.warn("CDs com falha: " + relatorio.falha.join(" | "));

  // ── Etapa 3: atualiza impacto de estoque nos pedidos pendentes ────────────
  atualizarImpactoEstoque(ss, shBase);

  console.log("──────────────────────────────────");
}

// ── FEAT-10: Impacto_Estoque ──────────────────────────────────────────────────
/**
 * Calcula e grava a coluna Impacto_Estoque em SOLICITACOES_ITENS
 * para todos os itens cujo pedido esteja PENDENTE ou APROVADO.
 *
 * Lógica de cor:
 *   🟢  restante >= 30% do saldo atual  → estoque ok
 *   🟡  restante > 0 e < 30% do saldo  → estoque baixo
 *   🔴  restante <= 0                  → déficit
 *
 * @param {Spreadsheet} ss     - instância já aberta da Master
 * @param {Sheet}       shBase - aba BASE_PRODUTOS já aberta
 */
function atualizarImpactoEstoque(ss, shBase) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    console.warn("⚠️ atualizarImpactoEstoque: lock não obtido, pulando.");
    return;
  }

  try {
    // 1. Monta mapa de saldo: { SKU_UPPER: total }
    const saldoMap = {};
    if (shBase && shBase.getLastRow() > 1) {
      const baseHdrs = shBase.getRange(1, 1, 1, shBase.getLastColumn()).getValues()[0];
      const colTotal = baseHdrs.findIndex(h => h.toString().toUpperCase().includes("TOTAL"));
      const baseData = shBase.getRange(2, 1, shBase.getLastRow() - 1, shBase.getLastColumn()).getValues();
      baseData.forEach(r => {
        const sku = r[0].toString().trim().toUpperCase();
        if (sku) saldoMap[sku] = colTotal >= 0 ? (parseFloat(r[colTotal]) || 0) : 0;
      });
    }

    // 2. Lê SOLICITACOES_HEADER → monta set de IDs com pedidos ativos
    const shHeader = ss.getSheetByName("SOLICITACOES_HEADER");
    const idsPendentes = new Set();
    if (shHeader && shHeader.getLastRow() > 1) {
      const hdData = shHeader.getRange(1, 1, shHeader.getLastRow(), shHeader.getLastColumn()).getValues();
      const hdCols = hdData[0];
      // Procura coluna de ID do pedido (evita ID_CLICKUP e ID_PROJETO)
      const colId = hdCols.findIndex(h => {
        const u = h.toString().toUpperCase();
        return u.includes("ID") && !u.includes("CLICK") && !u.includes("PROJ") && !u.includes("RESP");
      });
      const colSt = hdCols.findIndex(h => h.toString().toUpperCase().includes("STATUS"));

      if (colId >= 0 && colSt >= 0) {
        for (let i = 1; i < hdData.length; i++) {
          const st = hdData[i][colSt].toString().trim().toUpperCase();
          if (st === "PENDENTE" || st === "APROVADO") {
            const id = hdData[i][colId].toString().trim();
            if (id) idsPendentes.add(id);
          }
        }
        console.log("📋 Pedidos pendentes/aprovados: " + idsPendentes.size);
      } else {
        console.warn("⚠️ Colunas ID/STATUS não localizadas em SOLICITACOES_HEADER — atualizando todos os itens.");
      }
    }

    // 3. Lê SOLICITACOES_ITENS
    const shItens = ss.getSheetByName("SOLICITACOES_ITENS");
    if (!shItens || shItens.getLastRow() <= 1) {
      console.log("ℹ️ SOLICITACOES_ITENS vazia — nada a atualizar.");
      return;
    }

    const itData = shItens.getRange(1, 1, shItens.getLastRow(), shItens.getLastColumn()).getValues();
    const itHdrs = itData[0];

    const colIdPedido = itHdrs.findIndex(h => {
      const u = h.toString().toUpperCase();
      return u.includes("ID") && u.includes("PEDIDO");
    });
    const colSKU     = itHdrs.findIndex(h => h.toString().toUpperCase() === "SKU");
    const colQtd     = itHdrs.findIndex(h => h.toString().toUpperCase().includes("QUANT"));
    const colImpacto = itHdrs.findIndex(h => h.toString().toUpperCase().includes("IMPACTO"));

    if (colImpacto < 0) {
      console.error("❌ Coluna Impacto_Estoque não encontrada. Execute adicionarColunaImpactoEstoque() primeiro.");
      return;
    }
    if (colSKU < 0 || colQtd < 0) {
      console.error("❌ Coluna SKU ou Quantidade não encontrada em SOLICITACOES_ITENS.");
      return;
    }

    // 4. Calcula e grava em batch
    const updates = [];
    for (let i = 1; i < itData.length; i++) {
      if (idsPendentes.size > 0 && colIdPedido >= 0) {
        const idPedido = itData[i][colIdPedido].toString().trim();
        if (!idsPendentes.has(idPedido)) continue;
      }

      const sku = itData[i][colSKU].toString().trim().toUpperCase();
      const qtd = parseFloat(itData[i][colQtd]) || 0;
      if (!sku || qtd === 0) continue;

      const saldo = saldoMap[sku] !== undefined ? saldoMap[sku] : null;
      let texto;

      if (saldo === null) {
        texto = "❓ SKU não encontrado";
      } else {
        const restante  = saldo - qtd;
        const threshold = saldo * 0.3;
        if (restante <= 0) {
          texto = "🔴 Déficit: " + restante;
        } else if (restante < threshold) {
          texto = "🟡 Restante: " + restante;
        } else {
          texto = "🟢 Restante: " + restante;
        }
      }
      updates.push({ row: i + 1, col: colImpacto + 1, valor: texto });
    }

    updates.forEach(u => shItens.getRange(u.row, u.col).setValue(u.valor));
    if (updates.length > 0) SpreadsheetApp.flush();

    console.log("✅ Impacto_Estoque atualizado: " + updates.length + " itens.");

  } catch (e) {
    console.error("❌ Erro em atualizarImpactoEstoque: " + e.message);
  } finally {
    lock.releaseLock();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _abrirAba(ss, abasAceitas) {
  for (const nome of abasAceitas) {
    const sh = ss.getSheetByName(nome);
    if (sh) return sh;
  }
  return null;
}

function _normalizarSKU(valor) {
  if (!valor) return "";
  return valor.toString().trim().toUpperCase();
}

function _ehCabecalho(sku) {
  return CABECALHOS_IGNORADOS.some((h) => sku.toLowerCase() === h);
}

function _parseQtd(valor) {
  const n = parseFloat(valor);
  return isNaN(n) ? null : n;
}

function _skuInvalido(sku) {
  if (sku.includes("\n") || sku.includes("\r")) return true;
  if (sku.length > 50) return true;
  if (sku.includes(" ") && !sku.includes("-")) return true;
  return false;
}

// ── Diagnóstico Rio Varejo ────────────────────────────────────────────────────
function diagnosticarRioVarejo() {
  try {
    const ss   = SpreadsheetApp.openById(getIdPlanilha("CD_RIO_VAREJO"));
    const shDB = ss.getSheetByName("Dash");
    if (!shDB) { console.error("❌ Aba 'Dash' não encontrada no Rio Varejo."); return; }

    const dados = shDB.getDataRange().getValues();
    console.log("Total de linhas na Dash: " + dados.length);
    for (let i = 0; i < Math.min(10, dados.length); i++) {
      const l = dados[i];
      console.log("Linha " + (i+1) + " | A:[" + l[0] + "] B:[" + l[1] + "] C:[" + l[2] + "] D:[" + l[3] + "]");
    }
  } catch (e) {
    console.error("❌ Erro ao acessar Rio Varejo: " + e.message);
  }
}
