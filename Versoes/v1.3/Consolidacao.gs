/**
 * ============================================================
 * LIQUIDZ — CONSOLIDAÇÃO.gs — Projeto v1.1
 * Função: Varre os 5 CDs e consolida saldos na BASE_PRODUTOS
 * ============================================================
 *
 * Changelog v1.1:
 * [BUG-01] getActiveSpreadsheet() substituído por openById()
 * [TESTE]  IDs lidos via getIdPlanilha() — suporta ambiente producao/teste
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
  console.log("──────────────────────────────────");
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
