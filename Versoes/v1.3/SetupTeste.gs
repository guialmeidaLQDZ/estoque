/**
 * ============================================================
 * LIQUIDZ — SETUPTESTE.gs — Projeto v1.1
 * Utilitário de setup do ambiente de testes.
 * ============================================================
 *
 * COMO USAR:
 *   1. Faça deploy deste arquivo via clasp push
 *   2. No GAS, execute criarAmbienteTeste() UMA ÚNICA VEZ
 *   3. Aguarde o log confirmar os IDs criados
 *   4. Execute ativarTeste() para ligar o ambiente de teste
 *   5. Para destruir o ambiente de teste: execute destruirAmbienteTeste()
 *
 * O que este script faz:
 *   - Copia as 7 planilhas (Master + Setup + 5 CDs) via Drive API
 *   - Insere dados fictícios nas planilhas de teste
 *   - Salva os novos IDs em PropertiesService (chaves TESTE_*)
 *   - NÃO toca nas planilhas de produção
 */

// ── IDs de produção (fonte das cópias) ───────────────────────────────────────
const PLANILHAS_PROD = {
  MASTER:          "1yCK8TlPShu9QwNd5O9pg3izDAHwgxpov1zMgDGC17n4",
  SETUP:           "1B6QBQC6dCkIj44EAn0v5fIHAgzLvluC5F7W2dvv_N7k",
  CD_ESCRITORIO:   "1fawv-GbiImQRW-oN8pULm3XLGn6AhH3EdLTTozw9lFg",
  CD_RIO:          "1svu-oT0FaNozATlfC0XBq-gPrw3kVWeRknKJadVME_Q",
  CD_GALP_EVENTOS: "1ufZB7k-Qm4_j-GRsrsG-0LPtOu3iaFSfq8Jr-J_Ipnw",
  CD_GALP_VAREJO:  "1r7ZmcH-5Bl5NzHCiijyfgJboHSpHHGuDDDJByUA6Btg",
  CD_RIO_VAREJO:   "1tj4RFEufuo8U7piexJkpIQb4UFXjGeCvxiKUecpgxh4"
};

// ── Cria o ambiente de teste completo ────────────────────────────────────────
function criarAmbienteTeste() {
  const props = PropertiesService.getScriptProperties();

  // Verifica se já existe para não duplicar
  if (props.getProperty("TESTE_MASTER")) {
    console.warn("⚠️ Ambiente de teste já existe. Para recriar, rode destruirAmbienteTeste() primeiro.");
    listarIdsAmbienteTeste();
    return;
  }

  console.log("🚀 Criando ambiente de teste...");
  console.log("──────────────────────────────────");

  const token   = ScriptApp.getOAuthToken();
  let novosIds  = {};
  let erros     = [];

  // Copia cada planilha via Drive API
  const entradas = Object.entries(PLANILHAS_PROD);
  for (const [chave, idOrigem] of entradas) {
    try {
      const nomeCopia = "[TESTE] " + chave.replace(/_/g, " ");
      const novoId    = _copiarPlanilha(token, idOrigem, nomeCopia);
      novosIds["TESTE_" + chave] = novoId;
      console.log("✅ " + chave + " → " + novoId);
    } catch (e) {
      console.error("❌ Falha ao copiar " + chave + ": " + e.message);
      erros.push(chave);
    }
  }

  if (erros.length > 0) {
    console.error("❌ Não foi possível copiar: " + erros.join(", ") + ". Ambiente de teste NÃO configurado.");
    return;
  }

  // Salva os IDs no PropertiesService
  props.setProperties(novosIds);
  console.log("──────────────────────────────────");
  console.log("✅ IDs de teste salvos no PropertiesService.");

  // Popula dados fictícios
  _popularDadosTeste(novosIds);

  console.log("──────────────────────────────────");
  console.log("✅ AMBIENTE DE TESTE PRONTO.");
  console.log("Execute ativarTeste() para ativá-lo.");
  console.log("──────────────────────────────────");
}

// ── Popula as planilhas de teste com dados fictícios ─────────────────────────
function _popularDadosTeste(ids) {
  console.log("📝 Populando dados fictícios...");

  // ── Master: BASE_PRODUTOS ─────────────────────────────────────────────────
  try {
    const ssMaster = SpreadsheetApp.openById(ids["TESTE_MASTER"]);
    const shBase   = ssMaster.getSheetByName("BASE_PRODUTOS");
    if (shBase) {
      const ultima = shBase.getLastRow();
      if (ultima > 1) shBase.getRange(2, 1, ultima - 1, 9).clearContent();
      shBase.getRange(2, 1, 3, 9).setValues([
        ["SKU-001", "Copo Acrílico 500ml",    10, 5, 8, 3, 2, 28, new Date()],
        ["SKU-002", "Mesa Dobrável",           2,  1, 4, 0, 1, 8,  new Date()],
        ["SKU-003", "Bandeira Liquidz 2x1m",  20, 0, 15, 10, 0, 45, new Date()]
      ]);
      console.log("✅ BASE_PRODUTOS populada.");
    }

    // ── Master: HISTORICO_MOVIMENTACAO — uma saída APROVADA para teste ──────
    const shHist = ssMaster.getSheetByName("HISTORICO_MOVIMENTACAO");
    if (shHist) {
      const ultimaH = shHist.getLastRow();
      if (ultimaH > 1) shHist.getRange(2, 1, ultimaH - 1, 13).clearContent();
      const agora = new Date();
      shHist.getRange(2, 1, 2, 11).setValues([
        [agora, agora, "SKU-001", "Copo Acrílico 500ml", 3, "Saída",  "Escritório",    "", "", "Evento Teste Alpha", "APROVADO", ""],
        [agora, agora, "SKU-002", "Mesa Dobrável",        1, "Entrada","Galpão Eventos","", "", "Evento Teste Alpha", "APROVADO", ""]
      ]);
      console.log("✅ HISTORICO_MOVIMENTACAO populado (2 linhas APROVADO).");
    }

    SpreadsheetApp.flush();
  } catch (e) {
    console.error("❌ Erro ao popular Master: " + e.message);
  }

  // ── Setup: Setup Itens e Produtos ─────────────────────────────────────────
  try {
    const ssSetup = SpreadsheetApp.openById(ids["TESTE_SETUP"]);
    const shSetup = ssSetup.getSheetByName("Setup Itens e Produtos");
    if (shSetup) {
      const ultima = shSetup.getLastRow();
      if (ultima > 1) shSetup.getRange(2, 1, ultima - 1, 6).clearContent();
      shSetup.getRange(2, 1, 3, 6).setValues([
        ["", "Copo Acrílico 500ml",   "SKU-001", "Copo Acrílico 500ml",   12.50, "SIM"],
        ["", "Mesa Dobrável",          "SKU-002", "Mesa Dobrável",          85.00, "NÃO"],
        ["", "Bandeira Liquidz 2x1m", "SKU-003", "Bandeira Liquidz 2x1m", 45.00, "SIM"]
      ]);
      console.log("✅ Setup Itens e Produtos populado.");
      SpreadsheetApp.flush();
    }
  } catch (e) {
    console.error("❌ Erro ao popular Setup: " + e.message);
  }

  // ── CDs: garante aba Lançamentos com cabeçalho ────────────────────────────
  const cdsTeste = [
    { chave: "TESTE_CD_ESCRITORIO",   aba: "Lançamentos" },
    { chave: "TESTE_CD_RIO",          aba: "Lançamentos" },
    { chave: "TESTE_CD_GALP_EVENTOS", aba: "Lançamentos" },
    { chave: "TESTE_CD_GALP_VAREJO",  aba: "Lançamentos" },
    { chave: "TESTE_CD_RIO_VAREJO",   aba: "CONTROLE"    }
  ];

  for (const cd of cdsTeste) {
    try {
      const ssCD = SpreadsheetApp.openById(ids[cd.chave]);
      let sh     = ssCD.getSheetByName(cd.aba);
      if (!sh) {
        sh = ssCD.insertSheet(cd.aba);
        console.log("ℹ️ Aba '" + cd.aba + "' criada em " + cd.chave);
      }
      // Limpa lançamentos anteriores (mantém linha 1 como header se existir)
      const ultima = sh.getLastRow();
      if (ultima > 1) sh.getRange(2, 1, ultima - 1, 10).clearContent();
      SpreadsheetApp.flush();
      console.log("✅ " + cd.chave + " → aba '" + cd.aba + "' pronta.");
    } catch (e) {
      console.error("❌ Erro ao preparar CD " + cd.chave + ": " + e.message);
    }
  }
}

// ── Destrói o ambiente de teste (apaga cópias e limpa propriedades) ───────────
function destruirAmbienteTeste() {
  const props  = PropertiesService.getScriptProperties();
  const token  = ScriptApp.getOAuthToken();
  const chaves = ["MASTER","SETUP","CD_ESCRITORIO","CD_RIO","CD_GALP_EVENTOS","CD_GALP_VAREJO","CD_RIO_VAREJO"];

  console.log("🗑️ Destruindo ambiente de teste...");

  for (const chave of chaves) {
    const propKey = "TESTE_" + chave;
    const id      = props.getProperty(propKey);
    if (!id) continue;
    try {
      UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + id + "?supportsAllDrives=true", {
        method: "DELETE", headers: { "Authorization": "Bearer " + token }, muteHttpExceptions: true
      });
      props.deleteProperty(propKey);
      console.log("✅ Apagado: " + chave + " (" + id + ")");
    } catch (e) {
      console.error("❌ Falha ao apagar " + chave + ": " + e.message);
    }
  }

  // Volta para produção se estava em teste
  if (props.getProperty("AMBIENTE") === "teste") {
    props.setProperty("AMBIENTE", "producao");
    console.log("ℹ️ Ambiente revertido para PRODUÇÃO.");
  }

  console.log("✅ Ambiente de teste destruído.");
}

// ── Lista os IDs do ambiente de teste ────────────────────────────────────────
function listarIdsAmbienteTeste() {
  const props  = PropertiesService.getScriptProperties().getProperties();
  const chaves = ["MASTER","SETUP","CD_ESCRITORIO","CD_RIO","CD_GALP_EVENTOS","CD_GALP_VAREJO","CD_RIO_VAREJO"];
  console.log("📋 IDs do ambiente de teste:");
  chaves.forEach(c => console.log("  TESTE_" + c + " = " + (props["TESTE_" + c] || "NÃO CONFIGURADO")));
}

// ── Helper: copia planilha via Drive REST API ─────────────────────────────────
function _copiarPlanilha(token, idOrigem, novoNome) {
  const res  = UrlFetchApp.fetch(
    "https://www.googleapis.com/drive/v3/files/" + idOrigem + "/copy?supportsAllDrives=true",
    {
      method:      "POST",
      headers:     { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
      payload:     JSON.stringify({ name: novoNome }),
      muteHttpExceptions: true
    }
  );
  const json = JSON.parse(res.getContentText());
  if (res.getResponseCode() !== 200) {
    throw new Error("HTTP " + res.getResponseCode() + ": " + (json.error && json.error.message || res.getContentText()));
  }
  return json.id;
}
