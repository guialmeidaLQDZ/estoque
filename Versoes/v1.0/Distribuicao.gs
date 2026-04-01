/**
 * VERSÃO 7.8 - RASTREABILIDADE TOTAL LIQUIDZ
 * [FEAT-02] Sistema de Logs e Rastreabilidade de Erros (Coluna M)
 * [FEAT-01] Validação de Estoque Just-in-Time (anti estoque negativo)
 * [FIX] ID fixo da planilha Master para funcionar corretamente em gatilhos de tempo
 * [FIX] nomeNoDropdown corrigido: Galpão Varejo → "Storage Varejo", Galpão Eventos → "Storage Eventos"
 * [FIX] clearContent movido para depois do filtro de status
 * [FIX] insertRowAfter de 1 linha em vez de 200 para evitar deslocamento por formatação
 * Coluna K = STATUS LOGÍSTICA | Coluna L = STATUS FINANCEIRO | Coluna M = LOG_ERRO
 */

// ─── ID FIXO DA PLANILHA MASTER ───────────────────────────────────────────────
const ID_PLANILHA_MASTER = "1yCK8TlPShu9QwNd5O9pg3izDAHwgxpov1zMgDGC17n4";

// ─── UTILITÁRIO DE LOG ────────────────────────────────────────────────────────
function _distribuicaoLog(sheet, rowNumber, funcName, message, marcarComoErro) {
  if (!sheet || !rowNumber) {
    console.error("[_distLog] Parâmetros inválidos — sheet: " + sheet + " | linha: " + rowNumber);
    return;
  }
  try {
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    const logMsg = "[" + timestamp + "] " + funcName + ": " + message;
    sheet.getRange(rowNumber, 13).setValue(logMsg);
    if (marcarComoErro) {
      sheet.getRange(rowNumber, 11).setValue("ERRO");
    }
  } catch (logErr) {
    console.error("[_distLog] Falha ao gravar na linha " + rowNumber + ": " + logErr.message);
  }
}

// ─── UTILITÁRIO DE VALIDAÇÃO DE ESTOQUE ──────────────────────────────────────
function construirMapaSaldos(dadosBase) {
  const mapa = {};
  const colunasPorLocal = {
    "Escritório":     2,
    "Rio":            3,
    "Galpão Eventos": 4,
    "Galpão Varejo":  5,
    "Rio Varejo":     6
  };
  for (let i = 1; i < dadosBase.length; i++) {
    let sku = dadosBase[i][0] ? dadosBase[i][0].toString().trim().toUpperCase() : "";
    if (!sku) continue;
    mapa[sku] = {};
    for (let local in colunasPorLocal) {
      mapa[sku][local] = parseFloat(dadosBase[i][colunasPorLocal[local]]) || 0;
    }
  }
  return mapa;
}

function validarEstoque(mapaSaldos, saldoEmTransito, sku, localCD, qtdSolicitada) {
  let saldoBase = (mapaSaldos[sku] && mapaSaldos[sku][localCD] !== undefined)
    ? mapaSaldos[sku][localCD]
    : null;

  if (saldoBase === null) {
    return { valido: true, saldoAtual: null, saldoDisponivel: null, skuDesconhecido: true };
  }

  let chaveTransito   = sku + "|" + localCD;
  let comprometido    = saldoEmTransito[chaveTransito] || 0;
  let saldoDisponivel = saldoBase - comprometido;

  return {
    valido: saldoDisponivel >= qtdSolicitada,
    saldoAtual: saldoBase,
    saldoDisponivel: saldoDisponivel,
    skuDesconhecido: false
  };
}

// ─── FUNÇÃO PRINCIPAL ─────────────────────────────────────────────────────────
function distribuirMovimentacoes() {
  console.log("🔍 INÍCIO distribuirMovimentacoes - " + new Date().toISOString());

  let lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    console.log("Aguardando outra execução terminar...");
    return;
  }

  try {
  const ss          = SpreadsheetApp.openById(ID_PLANILHA_MASTER);
  const shHistorico = ss.getSheetByName("HISTORICO_MOVIMENTACAO");
  const shBase      = ss.getSheetByName("BASE_PRODUTOS");

  if (!shHistorico || !shBase) {
    console.error("Abas HISTORICO_MOVIMENTACAO ou BASE_PRODUTOS não encontradas.");
    return; // fix: finally libera o lock
  }

  const dadosBase = shBase.getDataRange().getValues();

  let dicionarioNomes = {};
  for (let b = 1; b < dadosBase.length; b++) {
    let skuKey = dadosBase[b][0] ? dadosBase[b][0].toString().trim().toUpperCase() : "";
    if (skuKey) dicionarioNomes[skuKey] = dadosBase[b][1] ? dadosBase[b][1].toString().trim() : "";
  }

  const mapaSaldos    = construirMapaSaldos(dadosBase);
  let saldoEmTransito = {};
  const dados = shHistorico.getDataRange().getValues();

  const fontes = [
    {id: "1fawv-GbiImQRW-oN8pULm3XLGn6AhH3EdLTTozw9lFg", local: "Escritório",     tipo: "padrao",        nomeNoDropdown: "Escritório"},
    {id: "1svu-oT0FaNozATlfC0XBq-gPrw3kVWeRknKJadVME_Q", local: "Rio",            tipo: "rio_especifico", nomeNoDropdown: "Rio"},
    {id: "1r7ZmcH-5Bl5NzHCiijyfgJboHSpHHGuDDDJByUA6Btg", local: "Galpão Varejo",  tipo: "padrao",        nomeNoDropdown: "Storage Varejo"},
    {id: "1tj4RFEufuo8U7piexJkpIQb4UFXjGeCvxiKUecpgxh4", local: "Rio Varejo",     tipo: "agregado",       nomeNoDropdown: "Rio Varejo"},
    {id: "1ufZB7k-Qm4_j-GRsrsG-0LPtOu3iaFSfq8Jr-J_Ipnw", local: "Galpão Eventos", tipo: "padrao",        nomeNoDropdown: "Storage Eventos"}
  ];

  let cacheAbas      = {};
  let cacheProxLinha = {};

  for (let i = 1; i < dados.length; i++) {
    let row       = dados[i];
    let skuRaw    = row[2];
    let linhaReal = i + 1;

    let statusAtual = row[10] ? row[10].toString().trim().toUpperCase() : "";
    if (!skuRaw || statusAtual !== "APROVADO") continue;

    shHistorico.getRange(linhaReal, 13).clearContent();

    let sku        = skuRaw.toString().trim().toUpperCase();
    let tipoMov    = row[5] ? row[5].toString().trim() : "";
    let qtdSolicit = Math.abs(parseFloat(row[4]) || 0);

    let config = fontes.find(f => f.local === row[6]);
    if (!config) {
      _distribuicaoLog(shHistorico, linhaReal, "distribuirMovimentacoes",
        "Local de CD não mapeado: '" + row[6] + "'", true);
      console.warn("⚠️ Local não mapeado: " + row[6]);
      continue;
    }

    if (tipoMov === "Saída") {
      let validacao = validarEstoque(mapaSaldos, saldoEmTransito, sku, config.local, qtdSolicit);

      if (validacao.skuDesconhecido) {
        _distribuicaoLog(shHistorico, linhaReal, "validarEstoque",
          "SKU '" + sku + "' não encontrado na BASE_PRODUTOS. Processado sem validação de saldo.", false);
        console.warn("⚠️ SKU desconhecido na base: " + sku);

      } else if (!validacao.valido) {
        let msg = "SALDO INSUFICIENTE: SKU '" + sku + "' no CD '" + config.local + "'. "
          + "Solicitado: " + qtdSolicit
          + " | Disponível: " + validacao.saldoDisponivel
          + " (Saldo base: " + validacao.saldoAtual + ")";
        _distribuicaoLog(shHistorico, linhaReal, "validarEstoque", msg, true);
        console.warn("🚫 " + msg);
        continue;
      }

      let chaveTransito = sku + "|" + config.local;
      saldoEmTransito[chaveTransito] = (saldoEmTransito[chaveTransito] || 0) + qtdSolicit;
    }

    try {
      if (!cacheAbas[config.id]) {
        let destSS;
        try {
          destSS = SpreadsheetApp.openById(config.id);
        } catch (openErr) {
          _distribuicaoLog(shHistorico, linhaReal, "distribuirMovimentacoes",
            "Sem permissão para acessar planilha do CD '" + config.local + "': " + openErr.message, true);
          continue;
        }

        let sheetName = (config.tipo === "agregado") ? "CONTROLE" : "Lançamentos";
        let sheet     = destSS.getSheetByName(sheetName);

        if (!sheet) {
          _distribuicaoLog(shHistorico, linhaReal, "distribuirMovimentacoes",
            "Aba '" + sheetName + "' não encontrada no CD '" + config.local + "'", true);
          continue;
        }

        cacheAbas[config.id]      = sheet;
        cacheProxLinha[config.id] = sheet.getLastRow() + 1;
      }

      let destSheet    = cacheAbas[config.id];
      let proximaLinha = cacheProxLinha[config.id];

      // Expande apenas 1 linha se necessário — evita deslocamento por formatação herdada
      if (proximaLinha > destSheet.getMaxRows()) {
        destSheet.insertRowAfter(destSheet.getMaxRows());
      }

      let nomeFinal = dicionarioNomes[sku] || row[3] || sku;

      destSheet.getRange(proximaLinha, 3).setDataValidation(null).setValue(nomeFinal);
      destSheet.getRange(proximaLinha, 2).setValue(row[1]);
      destSheet.getRange(proximaLinha, 4).setValue(sku);

      let colDesc = (config.tipo === "rio_especifico") ? 5 : 8;
      destSheet.getRange(proximaLinha, colDesc).setValue(row[5] + " - " + row[9]);
      destSheet.getRange(proximaLinha, 9).setValue(config.nomeNoDropdown);
      destSheet.getRange(proximaLinha, 10).setValue(qtdSolicit * (tipoMov === "Saída" ? -1 : 1));

      shHistorico.getRange(linhaReal, 11).setValue("ENVIADO");
      shHistorico.getRange(linhaReal, 13).clearContent();

      cacheProxLinha[config.id]++;
      console.log("✅ Processado: " + sku + " → " + config.local + " | Linha: " + proximaLinha + " | Qtd: " + qtdSolicit);

    } catch (e) {
      console.error("❌ Erro no CD " + config.local + ": " + e.message);
      _distribuicaoLog(shHistorico, linhaReal, "distribuirMovimentacoes",
        "Erro inesperado no CD '" + config.local + "': " + e.message, true);
    }
  }

  SpreadsheetApp.flush(); // fix: único flush após o loop
  console.log("✅ distribuirMovimentacoes concluída.");

  } finally {
    lock.releaseLock(); // fix: sempre liberado mesmo em erro
  }
}