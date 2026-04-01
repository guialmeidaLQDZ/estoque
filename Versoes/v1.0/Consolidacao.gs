/**
 * ============================================================
 * LIQUIDZ — CONSOLIDAÇÃO.gs
 * Sprint: 9 de março | Versão: 2.1
 * Função: Varre os 5 CDs e consolida saldos na BASE_PRODUTOS
 * ============================================================
 *
 * CORREÇÕES APLICADAS NESTA VERSÃO:
 * [FIX-1] SKUs normalizados para UPPERCASE em todo o pipeline
 * [FIX-2] Filtro de cabeçalho expandido para capturar variações comuns
 * [FIX-3] Janela de escrita atômica: clear + set em batch único
 * [FIX-4] Log estruturado por CD ao final da execução
 * [FIX-5] Proteção contra planilha de CD inacessível não trava o restante
 * [FIX-6] Rio Varejo: lê aba Dash (B=SKU, C=Nome, D=Qtd), pulando 3 linhas de header
 *          Não lê mais a aba CONTROLE (que contém itens de saída, não saldo)
 */

// ── Mapeamento de CDs ─────────────────────────────────────────────────────────
// colIndex: posição 1-5 dentro do array inventarioMaster[sku]
// abasAceitas: tentadas em ordem até encontrar uma válida
// linhaInicio: índice (0-based) da primeira linha de dados — padrão 0, Rio Varejo usa 3
const CDS = [
  {
    id: "1fawv-GbiImQRW-oN8pULm3XLGn6AhH3EdLTTozw9lFg",
    local: "Escritório",
    colIndex: 1,
    abasAceitas: ["Dash", "CONTROLE", "CONTROLE "],
    linhaInicio: 0
  },
  {
    id: "1svu-oT0FaNozATlfC0XBq-gPrw3kVWeRknKJadVME_Q",
    local: "Rio",
    colIndex: 2,
    abasAceitas: ["Dash", "CONTROLE", "CONTROLE "],
    linhaInicio: 0
  },
  {
    id: "1ufZB7k-Qm4_j-GRsrsG-0LPtOu3iaFSfq8Jr-J_Ipnw",
    local: "Galpão Eventos",
    colIndex: 3,
    abasAceitas: ["Dash", "CONTAGEM ATUALIZADA GOODSTORAGE", "CONTROLE", "CONTROLE "],
    linhaInicio: 0
  },
  {
    id: "1r7ZmcH-5Bl5NzHCiijyfgJboHSpHHGuDDDJByUA6Btg",
    local: "Galpão Varejo",
    colIndex: 4,
    abasAceitas: ["Dash", "CONTROLE", "CONTROLE "],
    linhaInicio: 0
  },
  {
    id: "1tj4RFEufuo8U7piexJkpIQb4UFXjGeCvxiKUecpgxh4",
    local: "Rio Varejo",
    colIndex: 5,
    abasAceitas: ["Dash"],   // Saldo real está na Dash. CONTROLE tem apenas saídas — não usar.
    linhaInicio: 3           // Linhas 1-3 são header. Dados começam na linha 4 (índice 3).
  }
];

// Palavras que indicam linha de cabeçalho — devem ser ignoradas
const CABECALHOS_IGNORADOS = ["código", "sku", "item", "produto", "nome", "cod", "ref"];

// ── Função principal ──────────────────────────────────────────────────────────
function consolidarSaldosCDs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shBase = ss.getSheetByName("BASE_PRODUTOS");
  if (!shBase) {
    console.error("❌ Aba BASE_PRODUTOS não encontrada.");
    return;
  }

  // inventarioMaster[SKU] = [nome, saldo1, saldo2, saldo3, saldo4, saldo5]
  // Construído 100% a partir dos CDs — sem pré-carregamento da Master,
  // pois ela pode conter lixo de execuções anteriores.
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

      // Respeita linhaInicio para CDs com header multi-linha (ex: Rio Varejo)
      for (let j = cd.linhaInicio; j < dadosCD.length; j++) {
        const linha = dadosCD[j];

        // B=índice 1 é o SKU padrão para todos os CDs mapeados
        const skuRaw = linha[1] || linha[0] || "";
        const sku = _normalizarSKU(skuRaw);

        if (!sku || _ehCabecalho(sku) || _skuInvalido(sku)) continue;

        // C=índice 2 é o Nome
        const nome = (linha[2] || linha[1] || "Sem Nome").toString().trim();

        // D=índice 3 é a Quantidade (fallback para C se necessário)
        const qtd = _parseQtd(linha[3]) ?? _parseQtd(linha[2]) ?? 0;

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
  const outputFinal = skusOrdenados.map((sku) => {
    const d = inventarioMaster[sku];
    const total = d[1] + d[2] + d[3] + d[4] + d[5];
    // SKU | Nome | Escritório | Rio | Galpão Eventos | Galpão Varejo | Rio Varejo | Total | Atualizado em
    return [sku, d[0], d[1], d[2], d[3], d[4], d[5], total, new Date()];
  });

  if (outputFinal.length > 0) {
    const ultimaLinha = shBase.getLastRow();
    if (ultimaLinha > 1) {
      shBase.getRange(2, 1, ultimaLinha - 1, 9).clearContent();
    }
    shBase.getRange(2, 1, outputFinal.length, 9).setValues(outputFinal);
    SpreadsheetApp.flush();
  }

  // ── Relatório final ───────────────────────────────────────────────────────
  console.log("──────────────────────────────────");
  console.log("CONSOLIDAÇÃO CONCLUÍDA");
  console.log("Total de SKUs únicos: " + skusOrdenados.length);
  console.log("CDs com sucesso: " + relatorio.sucesso.join(" | "));
  if (relatorio.falha.length > 0) {
    console.warn("CDs com falha: " + relatorio.falha.join(" | "));
  }
  console.log("──────────────────────────────────");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Abre a primeira aba encontrada na lista de nomes aceitos */
function _abrirAba(ss, abasAceitas) {
  for (const nome of abasAceitas) {
    const sh = ss.getSheetByName(nome);
    if (sh) return sh;
  }
  return null;
}

/** Normaliza SKU: trim + uppercase */
function _normalizarSKU(valor) {
  if (!valor) return "";
  return valor.toString().trim().toUpperCase();
}

/** Retorna true se o valor parece um cabeçalho de coluna */
function _ehCabecalho(sku) {
  return CABECALHOS_IGNORADOS.some((h) => sku.toLowerCase() === h);
}

/** Parse seguro de quantidade — retorna null se não ser número válido */
function _parseQtd(valor) {
  const n = parseFloat(valor);
  return isNaN(n) ? null : n;
}

// ── Diagnóstico: inspeciona as primeiras 10 linhas da aba Dash do Rio Varejo ──
// Rodar uma única vez para entender o layout real da planilha.
function diagnosticarRioVarejo() {
  const ID_RIO_VAREJO = "1tj4RFEufuo8U7piexJkpIQb4UFXjGeCvxiKUecpgxh4";
  try {
    const ss   = SpreadsheetApp.openById(ID_RIO_VAREJO);
    const shDB = ss.getSheetByName("Dash");

    if (!shDB) {
      console.error("❌ Aba 'Dash' não encontrada no Rio Varejo.");
      return;
    }

    const dados = shDB.getDataRange().getValues();
    console.log("Total de linhas na Dash: " + dados.length);
    console.log("Inspecionando primeiras 10 linhas (índice 0-based):");
    console.log("──────────────────────────────────");

    for (let i = 0; i < Math.min(10, dados.length); i++) {
      const linha = dados[i];
      console.log(
        "Linha " + (i + 1) + " (idx " + i + ")" +
        " | A: [" + linha[0] + "]" +
        " | B: [" + linha[1] + "]" +
        " | C: [" + linha[2] + "]" +
        " | D: [" + linha[3] + "]"
      );
    }
    console.log("──────────────────────────────────");
  } catch (e) {
    console.error("❌ Erro ao acessar Rio Varejo: " + e.message);
  }
}

/**
 * Retorna true se o SKU parece inválido — texto livre, endereço, frase longa etc.
 * Critérios: contém quebra de linha, tem mais de 50 chars, ou tem espaço mas não tem hífen.
 */
function _skuInvalido(sku) {
  if (sku.includes("\n") || sku.includes("\r")) return true;
  if (sku.length > 50) return true;
  if (sku.includes(" ") && !sku.includes("-")) return true;
  return false;
}