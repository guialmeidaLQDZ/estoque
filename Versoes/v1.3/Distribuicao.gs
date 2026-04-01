/**
 * ============================================================
 * LIQUIDZ — DISTRIBUIÇÃO.gs — Projeto v1.1
 * ============================================================
 *
 * Changelog v1.1:
 * [TESTE] IDs lidos via getIdPlanilha() — suporta ambiente producao/teste
 * (BUG-01/02/03 já estavam corrigidos desde v7.8)
 *
 * Coluna K = STATUS LOGÍSTICA | Coluna L = STATUS FINANCEIRO | Coluna M = LOG_ERRO
 */

// ── Utilitário de log ─────────────────────────────────────────────────────────
function _distribuicaoLog(sheet, rowNumber, funcName, message, marcarComoErro) {
  if (!sheet || !rowNumber) return;
  try {
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    sheet.getRange(rowNumber, 13).setValue("[" + timestamp + "] " + funcName + ": " + message);
    if (marcarComoErro) sheet.getRange(rowNumber, 11).setValue("ERRO");
  } catch (logErr) {
    console.error("[_distLog] Falha ao gravar na linha " + rowNumber + ": " + logErr.message);
  }
}

// ── Validação de estoque ──────────────────────────────────────────────────────
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
    ? mapaSaldos[sku][localCD] : null;

  if (saldoBase === null) return { valido: true, saldoAtual: null, saldoDisponivel: null, skuDesconhecido: true };

  let chave           = sku + "|" + localCD;
  let comprometido    = saldoEmTransito[chave] || 0;
  let saldoDisponivel = saldoBase - comprometido;

  return {
    valido:          saldoDisponivel >= qtdSolicitada,
    saldoAtual:      saldoBase,
    saldoDisponivel: saldoDisponivel,
    skuDesconhecido: false
  };
}

// ── Função principal ──────────────────────────────────────────────────────────
function distribuirMovimentacoes() {
  console.log("🌍 Ambiente: " + getAmbiente());
  console.log("🔍 INÍCIO distribuirMovimentacoes - " + new Date().toISOString());

  let lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { console.log("Aguardando outra execução terminar..."); return; }

  try {
    const ss          = SpreadsheetApp.openById(getIdPlanilha("MASTER"));
    const shHistorico = ss.getSheetByName("HISTORICO_MOVIMENTACAO");
    const shBase      = ss.getSheetByName("BASE_PRODUTOS");

    if (!shHistorico || !shBase) { console.error("Abas não encontradas."); return; }

    const dadosBase = shBase.getDataRange().getValues();

    let dicionarioNomes = {};
    for (let b = 1; b < dadosBase.length; b++) {
      let skuKey = dadosBase[b][0] ? dadosBase[b][0].toString().trim().toUpperCase() : "";
      if (skuKey) dicionarioNomes[skuKey] = dadosBase[b][1] ? dadosBase[b][1].toString().trim() : "";
    }

    const mapaSaldos    = construirMapaSaldos(dadosBase);
    let saldoEmTransito = {};
    const dados         = shHistorico.getDataRange().getValues();

    const fontes = [
      { id: getIdPlanilha("CD_ESCRITORIO"),   local: "Escritório",    tipo: "padrao",        nomeNoDropdown: "Escritório" },
      { id: getIdPlanilha("CD_RIO"),          local: "Rio",           tipo: "rio_especifico", nomeNoDropdown: "Rio" },
      { id: getIdPlanilha("CD_GALP_VAREJO"),  local: "Galpão Varejo", tipo: "padrao",        nomeNoDropdown: "Storage Varejo" },
      { id: getIdPlanilha("CD_RIO_VAREJO"),   local: "Rio Varejo",    tipo: "agregado",       nomeNoDropdown: "Rio Varejo" },
      { id: getIdPlanilha("CD_GALP_EVENTOS"), local: "Galpão Eventos",tipo: "padrao",        nomeNoDropdown: "Storage Eventos" }
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
        _distribuicaoLog(shHistorico, linhaReal, "distribuirMovimentacoes", "Local não mapeado: '" + row[6] + "'", true);
        continue;
      }

      if (tipoMov === "Saída") {
        let validacao = validarEstoque(mapaSaldos, saldoEmTransito, sku, config.local, qtdSolicit);
        if (validacao.skuDesconhecido) {
          _distribuicaoLog(shHistorico, linhaReal, "validarEstoque", "SKU '" + sku + "' desconhecido. Processado sem validação.", false);
        } else if (!validacao.valido) {
          let msg = "SALDO INSUFICIENTE: " + sku + " em " + config.local + ". Solicitado: " + qtdSolicit + " | Disponível: " + validacao.saldoDisponivel;
          _distribuicaoLog(shHistorico, linhaReal, "validarEstoque", msg, true);
          console.warn("🚫 " + msg);
          continue;
        }
        let chave = sku + "|" + config.local;
        saldoEmTransito[chave] = (saldoEmTransito[chave] || 0) + qtdSolicit;
      }

      try {
        if (!cacheAbas[config.id]) {
          let destSS;
          try { destSS = SpreadsheetApp.openById(config.id); }
          catch (openErr) {
            _distribuicaoLog(shHistorico, linhaReal, "distribuirMovimentacoes", "Sem permissão para CD '" + config.local + "': " + openErr.message, true);
            continue;
          }

          let sheetName = (config.tipo === "agregado") ? "CONTROLE" : "Lançamentos";
          let sheet     = destSS.getSheetByName(sheetName);
          if (!sheet) {
            _distribuicaoLog(shHistorico, linhaReal, "distribuirMovimentacoes", "Aba '" + sheetName + "' não encontrada em '" + config.local + "'", true);
            continue;
          }

          cacheAbas[config.id]      = sheet;
          cacheProxLinha[config.id] = sheet.getLastRow() + 1;
        }

        let destSheet    = cacheAbas[config.id];
        let proximaLinha = cacheProxLinha[config.id];

        if (proximaLinha > destSheet.getMaxRows()) destSheet.insertRowAfter(destSheet.getMaxRows());

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
        console.log("✅ " + sku + " → " + config.local + " | Qtd: " + qtdSolicit);

      } catch (e) {
        console.error("❌ Erro no CD " + config.local + ": " + e.message);
        _distribuicaoLog(shHistorico, linhaReal, "distribuirMovimentacoes", "Erro: " + e.message, true);
      }
    }

    SpreadsheetApp.flush();
    console.log("✅ distribuirMovimentacoes concluída.");

  } finally {
    lock.releaseLock();
  }
}
