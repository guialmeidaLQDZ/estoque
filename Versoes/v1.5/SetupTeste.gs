/**
 * ============================================================
 * LIQUIDZ — SETUPTESTE.gs — Projeto v1.5
 * Utilitário de setup do ambiente de testes e migrações de planilha.
 * ============================================================
 *
 * COMO USAR (ambiente de testes):
 *   1. Faça deploy deste arquivo via clasp push
 *   2. No GAS, execute criarAmbienteTeste() UMA ÚNICA VEZ
 *   3. Aguarde o log confirmar os IDs criados
 *   4. Execute ativarTeste() para ligar o ambiente de teste
 *   5. Para destruir o ambiente de teste: execute destruirAmbienteTeste()
 *
 * MIGRAÇÕES (rodar uma única vez por versão):
 *   - adicionarColunaJustificativa()  → v1.4: adiciona coluna Justificativa em SOLICITACOES_HEADER
 *   - adicionarColunaImpactoEstoque() → v1.5: adiciona coluna Impacto_Estoque em SOLICITACOES_ITENS
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

// ── Diagnóstico de abas da Master ────────────────────────────────────────────
function diagnosticarAbasMaster() {
  const ss    = SpreadsheetApp.openById(PLANILHAS_PROD.MASTER);
  const abas  = ss.getSheets();

  // Abas usadas pelos scripts GAS
  const abasGAS = [
    "HISTORICO_MOVIMENTACAO",
    "BASE_PRODUTOS",
    "RESUMO_FINANCEIRO",
    "SOLICITACOES_HEADER",
    "SOLICITACOES_ITENS",
    "SOLICITACOES_PDF",
    "USERS",
    "EVENTOS_ATIVOS",
    "LOG_API"
  ];

  console.log("════════════════════════════════════");
  console.log("DIAGNÓSTICO DE ABAS — MASTER");
  console.log("Total de abas: " + abas.length);
  console.log("════════════════════════════════════");

  abas.forEach(sh => {
    const nome   = sh.getName();
    const linhas = sh.getLastRow();
    const cols   = sh.getLastColumn();
    const usadaGAS = abasGAS.includes(nome);
    const flag   = usadaGAS ? "✅ GAS" : "❓ DESCONHECIDA";
    console.log(flag + " | " + nome + " | " + linhas + " linhas × " + cols + " colunas");
  });

  console.log("════════════════════════════════════");
  console.log("Legenda: ✅ GAS = referenciada nos scripts | ❓ = não referenciada");
}

// ── Diagnóstico FEAT-10 — verifica tudo de ponta a ponta ─────────────────────
function diagnosticarFEAT10() {
  const ss = SpreadsheetApp.openById(PLANILHAS_PROD.MASTER);

  console.log("════════════════════════════════════");
  console.log("DIAGNÓSTICO FEAT-10");
  console.log("════════════════════════════════════");

  // 1. BASE_PRODUTOS — verifica colunas e primeiras linhas
  const shBase = ss.getSheetByName("BASE_PRODUTOS");
  if (!shBase) { console.error("❌ BASE_PRODUTOS não encontrada."); }
  else {
    const hdrs = shBase.getRange(1, 1, 1, shBase.getLastColumn()).getValues()[0];
    console.log("BASE_PRODUTOS colunas: " + hdrs.map((h,i) => (i+1)+"="+h).join(" | "));
    console.log("BASE_PRODUTOS linhas de dados: " + (shBase.getLastRow() - 1));
    if (shBase.getLastRow() > 1) {
      const amostra = shBase.getRange(2, 1, Math.min(3, shBase.getLastRow()-1), hdrs.length).getValues();
      amostra.forEach((r,i) => console.log("  Linha "+(i+2)+": SKU="+r[0]+" | Total="+r[hdrs.length-2]));
    }
  }

  console.log("────────────────────────────────────");

  // 2. SOLICITACOES_HEADER — verifica colunas e status dos pedidos
  const shHdr = ss.getSheetByName("SOLICITACOES_HEADER");
  if (!shHdr) { console.error("❌ SOLICITACOES_HEADER não encontrada."); }
  else {
    const hdrs = shHdr.getRange(1, 1, 1, shHdr.getLastColumn()).getValues()[0];
    console.log("SOLICITACOES_HEADER colunas: " + hdrs.map((h,i) => (i+1)+"="+h).join(" | "));
    if (shHdr.getLastRow() > 1) {
      const dados = shHdr.getRange(2, 1, shHdr.getLastRow()-1, hdrs.length).getValues();
      const contagem = {};
      dados.forEach(r => {
        const st = r[hdrs.findIndex(h => h.toString().toUpperCase().includes("STATUS"))] || "(sem status)";
        contagem[st] = (contagem[st] || 0) + 1;
      });
      console.log("  Status encontrados: " + JSON.stringify(contagem));
    }
  }

  console.log("────────────────────────────────────");

  // 3. SOLICITACOES_ITENS — verifica colunas e conteúdo de Impacto_Estoque
  const shItens = ss.getSheetByName("SOLICITACOES_ITENS");
  if (!shItens) { console.error("❌ SOLICITACOES_ITENS não encontrada."); }
  else {
    const hdrs = shItens.getRange(1, 1, 1, shItens.getLastColumn()).getValues()[0];
    console.log("SOLICITACOES_ITENS colunas: " + hdrs.map((h,i) => (i+1)+"="+h).join(" | "));
    console.log("SOLICITACOES_ITENS linhas de dados: " + (shItens.getLastRow() - 1));

    const colImpacto = hdrs.findIndex(h => h.toString().toUpperCase().includes("IMPACTO"));
    if (colImpacto < 0) {
      console.error("  ❌ Coluna Impacto_Estoque NÃO encontrada na planilha.");
    } else {
      console.log("  ✅ Coluna Impacto_Estoque está na coluna " + (colImpacto+1));
      if (shItens.getLastRow() > 1) {
        const vals = shItens.getRange(2, colImpacto+1, shItens.getLastRow()-1, 1).getValues();
        const preenchidos = vals.filter(r => r[0] !== "").length;
        console.log("  Células preenchidas em Impacto_Estoque: " + preenchidos + " / " + (shItens.getLastRow()-1));
        // Mostra as primeiras 5
        vals.slice(0, 5).forEach((r,i) => console.log("  Linha "+(i+2)+": ["+r[0]+"]"));
      }
    }

    // Mostra primeiras 3 linhas completas
    if (shItens.getLastRow() > 1) {
      const amostra = shItens.getRange(2, 1, Math.min(3, shItens.getLastRow()-1), hdrs.length).getValues();
      amostra.forEach((r,i) => console.log("  Item linha "+(i+2)+": "+hdrs.map((h,c) => h+"="+r[c]).join(" | ")));
    }
  }

  console.log("════════════════════════════════════");
}

// ── Diagnóstico: loga cabeçalhos de qualquer aba da Master ───────────────────
function logCabecalhos() {
  const ss   = SpreadsheetApp.openById(PLANILHAS_PROD.MASTER);
  const abas = ["SOLICITACOES_HEADER", "SOLICITACOES_ITENS", "BASE_PRODUTOS"];
  abas.forEach(nome => {
    const sh = ss.getSheetByName(nome);
    if (!sh) { console.log("❌ Aba não encontrada: " + nome); return; }
    const hdrs = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    console.log("📋 " + nome + ": " + hdrs.map((h, i) => (i+1) + "=" + h).join(" | "));
  });
}

// ── MIGRAÇÃO v1.5 — adiciona coluna Impacto_Estoque em SOLICITACOES_ITENS ────
function adicionarColunaImpactoEstoque() {
  const ss = SpreadsheetApp.openById(PLANILHAS_PROD.MASTER);
  const sh = ss.getSheetByName("SOLICITACOES_ITENS");

  if (!sh) {
    console.error("❌ Aba SOLICITACOES_ITENS não encontrada.");
    return;
  }

  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  if (headers.some(h => h.toString().toUpperCase().includes("IMPACTO"))) {
    console.warn("⚠️ Coluna Impacto_Estoque já existe. Nada a fazer.");
    return;
  }

  const novaCol = sh.getLastColumn() + 1;
  sh.getRange(1, novaCol).setValue("Impacto_Estoque");
  SpreadsheetApp.flush();

  console.log("✅ Coluna Impacto_Estoque adicionada na coluna " + novaCol + " de SOLICITACOES_ITENS.");
}

// ── MIGRAÇÃO v1.4 — adiciona coluna Justificativa em SOLICITACOES_HEADER ─────
function adicionarColunaJustificativa() {
  const ss = SpreadsheetApp.openById(PLANILHAS_PROD.MASTER);
  const sh = ss.getSheetByName("SOLICITACOES_HEADER");

  if (!sh) {
    console.error("❌ Aba SOLICITACOES_HEADER não encontrada.");
    return;
  }

  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  if (headers.includes("Justificativa")) {
    console.warn("⚠️ Coluna Justificativa já existe. Nada a fazer.");
    return;
  }

  const novaCol = sh.getLastColumn() + 1;
  sh.getRange(1, novaCol).setValue("Justificativa");
  SpreadsheetApp.flush();

  console.log("✅ Coluna Justificativa adicionada na coluna " + novaCol + " de SOLICITACOES_HEADER.");
}

// ── Cria o ambiente de teste completo ────────────────────────────────────────
function criarAmbienteTeste() {
  const props = PropertiesService.getScriptProperties();

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

  props.setProperties(novosIds);
  console.log("──────────────────────────────────");
  console.log("✅ IDs de teste salvos no PropertiesService.");

  _popularDadosTeste(novosIds);

  console.log("──────────────────────────────────");
  console.log("✅ AMBIENTE DE TESTE PRONTO.");
  console.log("Execute ativarTeste() para ativá-lo.");
  console.log("──────────────────────────────────");
}

// ── Popula as planilhas de teste com dados fictícios ─────────────────────────
function _popularDadosTeste(ids) {
  console.log("📝 Populando dados fictícios...");

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

    const shHist = ssMaster.getSheetByName("HISTORICO_MOVIMENTACAO");
    if (shHist) {
      const ultimaH = shHist.getLastRow();
      if (ultimaH > 1) shHist.getRange(2, 1, ultimaH - 1, 13).clearContent();
      const agora = new Date();
      shHist.getRange(2, 1, 2, 11).setValues([
        [agora, agora, "SKU-001", "Copo Acrílico 500ml", 3, "Saída",  "Escritório",    "", "", "Evento Teste Alpha", "APROVADO", ""],
        [agora, agora, "SKU-002", "Mesa Dobrável",        1, "Entrada","Galpão Eventos","", "", "Evento Teste Alpha", "APROVADO", ""]
      ]);
      console.log("✅ HISTORICO_MOVIMENTACAO populado.");
    }

    SpreadsheetApp.flush();
  } catch (e) {
    console.error("❌ Erro ao popular Master: " + e.message);
  }

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
      const ultima = sh.getLastRow();
      if (ultima > 1) sh.getRange(2, 1, ultima - 1, 10).clearContent();
      SpreadsheetApp.flush();
      console.log("✅ " + cd.chave + " → aba '" + cd.aba + "' pronta.");
    } catch (e) {
      console.error("❌ Erro ao preparar CD " + cd.chave + ": " + e.message);
    }
  }
}

// ── Destrói o ambiente de teste ───────────────────────────────────────────────
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
