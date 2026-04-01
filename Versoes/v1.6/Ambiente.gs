/**
 * ============================================================
 * LIQUIDZ — AMBIENTE.gs — Projeto v1.1
 * Centraliza a leitura de IDs de planilhas por ambiente.
 * ============================================================
 *
 * COMO USAR:
 *   - Em vez de usar IDs hardcoded, todos os scripts chamam getIdPlanilha("MASTER")
 *   - A propriedade AMBIENTE (via PropertiesService) define qual conjunto de IDs usar
 *   - Valores possíveis: "producao" (padrão) ou "teste"
 *
 * SETUP:
 *   1. Rode configurarAmbienteProducao() uma única vez para gravar os IDs de produção
 *   2. Duplique as planilhas no Drive para criar o ambiente de teste
 *   3. Rode configurarAmbienteTeste() com os IDs das cópias
 *   4. Para alternar: rode ativarTeste() ou ativarProducao()
 */

// ── Leitura do ambiente atual ─────────────────────────────────────────────────

/**
 * Retorna o ID da planilha para o ambiente ativo.
 * @param {string} nome - "MASTER", "SETUP", "CD_ESCRITORIO", "CD_RIO",
 *                        "CD_GALP_EVENTOS", "CD_GALP_VAREJO", "CD_RIO_VAREJO"
 */
function getIdPlanilha(nome) {
  const props   = PropertiesService.getScriptProperties();
  const ambiente = props.getProperty("AMBIENTE") || "producao";
  const chave   = ambiente.toUpperCase() + "_" + nome;
  const id      = props.getProperty(chave);

  if (!id) {
    console.error("❌ ID não encontrado para: " + chave + ". Rode configurarAmbiente().");
    throw new Error("ID de planilha não configurado: " + chave);
  }
  return id;
}

/** Retorna o ambiente ativo ("producao" ou "teste") */
function getAmbiente() {
  return PropertiesService.getScriptProperties().getProperty("AMBIENTE") || "producao";
}

// ── Alternância de ambiente ───────────────────────────────────────────────────

function ativarProducao() {
  PropertiesService.getScriptProperties().setProperty("AMBIENTE", "producao");
  console.log("✅ Ambiente: PRODUÇÃO ativado.");
}

function ativarTeste() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("TESTE_MASTER")) {
    console.error("❌ IDs de teste não configurados. Rode configurarAmbienteTeste() primeiro.");
    return;
  }
  props.setProperty("AMBIENTE", "teste");
  console.log("✅ Ambiente: TESTE ativado.");
}

// ── Setup: grava IDs de produção (rodar uma única vez) ───────────────────────

function configurarAmbienteProducao() {
  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    "PRODUCAO_MASTER":         "1yCK8TlPShu9QwNd5O9pg3izDAHwgxpov1zMgDGC17n4",
    "PRODUCAO_SETUP":          "1B6QBQC6dCkIj44EAn0v5fIHAgzLvluC5F7W2dvv_N7k",
    "PRODUCAO_CD_ESCRITORIO":  "1fawv-GbiImQRW-oN8pULm3XLGn6AhH3EdLTTozw9lFg",
    "PRODUCAO_CD_RIO":         "1svu-oT0FaNozATlfC0XBq-gPrw3kVWeRknKJadVME_Q",
    "PRODUCAO_CD_GALP_EVENTOS":"1ufZB7k-Qm4_j-GRsrsG-0LPtOu3iaFSfq8Jr-J_Ipnw",
    "PRODUCAO_CD_GALP_VAREJO": "1r7ZmcH-5Bl5NzHCiijyfgJboHSpHHGuDDDJByUA6Btg",
    "PRODUCAO_CD_RIO_VAREJO":  "1tj4RFEufuo8U7piexJkpIQb4UFXjGeCvxiKUecpgxh4"
  });
  console.log("✅ IDs de PRODUÇÃO gravados.");
}

// ── Setup: grava IDs de teste (preencher com IDs das cópias e rodar uma vez) ──

function configurarAmbienteTeste() {
  // Substitua os valores pelos IDs das planilhas duplicadas no Drive
  const IDS_TESTE = {
    "TESTE_MASTER":          "COLE_AQUI_ID_MASTER_TESTE",
    "TESTE_SETUP":           "COLE_AQUI_ID_SETUP_TESTE",
    "TESTE_CD_ESCRITORIO":   "COLE_AQUI_ID_CD_ESCRITORIO_TESTE",
    "TESTE_CD_RIO":          "COLE_AQUI_ID_CD_RIO_TESTE",
    "TESTE_CD_GALP_EVENTOS": "COLE_AQUI_ID_CD_GALP_EVENTOS_TESTE",
    "TESTE_CD_GALP_VAREJO":  "COLE_AQUI_ID_CD_GALP_VAREJO_TESTE",
    "TESTE_CD_RIO_VAREJO":   "COLE_AQUI_ID_CD_RIO_VAREJO_TESTE"
  };

  const vals = Object.values(IDS_TESTE);
  if (vals.some(v => v.startsWith("COLE_AQUI"))) {
    console.error("❌ Preencha todos os IDs de teste antes de rodar.");
    return;
  }

  PropertiesService.getScriptProperties().setProperties(IDS_TESTE);
  console.log("✅ IDs de TESTE gravados.");
}

// ── Diagnóstico: lista todas as propriedades configuradas ─────────────────────

function listarPropriedadesAmbiente() {
  const props  = PropertiesService.getScriptProperties().getProperties();
  const atual  = props["AMBIENTE"] || "producao (padrão)";
  console.log("🌍 Ambiente ativo: " + atual);
  console.log("──────────────────────────────────");
  Object.keys(props).sort().forEach(k => {
    if (k !== "CLICKUP_TOKEN" && k !== "APPSHEET_API_KEY") {
      console.log(k + " = " + props[k]);
    }
  });
  console.log("──────────────────────────────────");
}
