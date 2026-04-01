/**
 * ============================================================
 * LIQUIDZ — FINANCEIRO.gs — Projeto v1.2
 * Função: Agrupa pedidos por evento, calcula custos e cria
 *         tarefas no ClickUp para a Fernanda (NF)
 * ============================================================
 *
 * Changelog v1.2:
 * [FEAT-08] Fluxo Trade Clientes: NF atribuída à Larissa em vez da Fernanda
 *
 * Changelog v1.1:
 * [BUG-01] sincronizarUsuariosClickUp(): getActiveSpreadsheet() → openById()
 * [TESTE]  IDs lidos via getIdPlanilha() — suporta ambiente producao/teste
 *
 * SETUP: rode configurarToken() uma única vez para salvar o token ClickUp.
 */

// ── Constantes não-sensíveis ──────────────────────────────────────────────────
const CLICKUP_LIST_ID_FIN = "901324926196";
const FERNANDA_ID_FIN     = 105990268;
const LARISSA_ID_FIN      = 111932998;
const TRADE_EVENTO_FIN    = "Trade Clientes"; // [FEAT-08] evento fixo do time de Trade
const EVENTOS_INVALIDOS   = ["[object object]", "undefined", "null", "#ref!", "#value!", "#n/a"];

// ── Função principal ──────────────────────────────────────────────────────────
function processarFinanceiroEClickUp() {
  const token = _getToken();
  if (!token) { console.error("❌ Token ClickUp não configurado."); return; }

  console.log("🌍 Ambiente: " + getAmbiente());

  const ss      = SpreadsheetApp.openById(getIdPlanilha("MASTER"));
  const shHist  = ss.getSheetByName("HISTORICO_MOVIMENTACAO");
  const shResumo = ss.getSheetByName("RESUMO_FINANCEIRO") || ss.insertSheet("RESUMO_FINANCEIRO");

  if (!shHist) { console.error("❌ Aba HISTORICO_MOVIMENTACAO não encontrada."); return; }

  let shSetup;
  try {
    const ssSetup = SpreadsheetApp.openById(getIdPlanilha("SETUP"));
    shSetup = ssSetup.getSheetByName("Setup Itens e Produtos");
    if (!shSetup) throw new Error("Aba 'Setup Itens e Produtos' não encontrada.");
  } catch (e) {
    console.error("❌ Erro ao acessar Planilha de Setup: " + e.message);
    return;
  }

  const dadosHist   = shHist.getDataRange().getValues();
  const dadosSetup  = shSetup.getDataRange().getValues();
  const dadosResumo = shResumo.getDataRange().getValues();

  let mapaResumo = {};
  for (let i = 1; i < dadosResumo.length; i++) {
    const nomeEv = dadosResumo[i][1] ? String(dadosResumo[i][1]).trim() : "";
    const link   = dadosResumo[i][4] ? String(dadosResumo[i][4]) : "";
    if (nomeEv) mapaResumo[nomeEv] = { linhaOriginal: i + 1, concluido: link.startsWith("http") };
  }

  let mapaSetup = {};
  for (let i = 1; i < dadosSetup.length; i++) {
    const sku = dadosSetup[i][2] ? String(dadosSetup[i][2]).trim().toUpperCase() : "";
    if (sku) mapaSetup[sku] = {
      nome:      dadosSetup[i][3] || "Item sem nome",
      preco:     parseFloat(dadosSetup[i][4]) || 0,
      precisaNF: String(dadosSetup[i][5] || "").toUpperCase().trim() === "SIM"
    };
  }

  let pedidosPendentes = {};
  for (let i = 1; i < dadosHist.length; i++) {
    const row    = dadosHist[i];
    const skuRaw = row[2];
    if (!skuRaw || skuRaw === "SKU") continue;

    const sku              = String(skuRaw).trim().toUpperCase();
    const nomeEvento       = row[9]  ? String(row[9]).trim()  : "";
    const statusLogistica  = row[10] ? String(row[10]).trim() : "";
    const statusFinanceiro = row[11] ? String(row[11]).trim() : "";

    if (!nomeEvento || EVENTOS_INVALIDOS.some((p) => nomeEvento.toLowerCase().includes(p))) continue;
    if (mapaResumo[nomeEvento] && mapaResumo[nomeEvento].concluido) continue;
    if (statusLogistica !== "ENVIADO" || statusFinanceiro === "PROCESSADO") continue;

    if (!pedidosPendentes[nomeEvento]) pedidosPendentes[nomeEvento] = { itens: [], indices: [] };
    pedidosPendentes[nomeEvento].itens.push({ sku, qtd: Math.abs(Number(row[4]) || 0), info: mapaSetup[sku] || null });
    pedidosPendentes[nomeEvento].indices.push(i + 1);
  }

  const nomesEventos = Object.keys(pedidosPendentes);
  if (nomesEventos.length === 0) { console.log("ℹ️ Nenhum evento pendente."); return; }

  console.log("📋 Eventos a processar: " + nomesEventos.length);

  let totalSucesso = 0, totalErro = 0;

  for (const nome of nomesEventos) {
    const pedido = pedidosPendentes[nome];
    let listaNF = [], custoTotalMateriais = 0;

    pedido.itens.forEach((item) => {
      custoTotalMateriais += item.qtd * (item.info ? item.info.preco : 0);
      if (item.info && item.info.precisaNF) {
        listaNF.push("- " + item.qtd + "x " + item.info.nome + " (SKU: " + item.sku + ")");
      }
    });

    // [FEAT-08] Trade Clientes → Larissa; demais eventos → Fernanda
    const assigneeId = (nome === TRADE_EVENTO_FIN) ? LARISSA_ID_FIN : FERNANDA_ID_FIN;

    let linkClickUp = "N/A";
    if (listaNF.length > 0) linkClickUp = _criarTarefaClickUp(token, nome, listaNF, custoTotalMateriais, assigneeId);

    const precisaNF = listaNF.length > 0 ? "SIM" : "NÃO";
    const sucesso   = !linkClickUp.startsWith("Erro");

    if (mapaResumo[nome]) {
      const linha = mapaResumo[nome].linhaOriginal;
      shResumo.getRange(linha, 3).setValue(custoTotalMateriais);
      shResumo.getRange(linha, 4).setValue(precisaNF);
      shResumo.getRange(linha, 5).setValue(linkClickUp);
    } else {
      shResumo.appendRow([new Date(), nome, custoTotalMateriais, precisaNF, linkClickUp]);
    }

    if (sucesso) {
      pedido.indices.forEach((idx) => shHist.getRange(idx, 12).setValue("PROCESSADO"));
      totalSucesso++;
      console.log("✅ " + nome + " | NF: " + precisaNF + " | Assignee: " + assigneeId + " | Custo: R$ " + custoTotalMateriais.toFixed(2));
    } else {
      totalErro++;
      console.error("❌ Falha ClickUp para: " + nome + " | " + linkClickUp);
    }
  }

  SpreadsheetApp.flush();
  console.log("FINANCEIRO CONCLUÍDO — Sucesso: " + totalSucesso + " | Erro: " + totalErro);
}

// ── Cria tarefa no ClickUp ────────────────────────────────────────────────────
function _criarTarefaClickUp(token, evento, listaNF, custoTotal, assigneeId) {
  if (!evento || EVENTOS_INVALIDOS.some((p) => evento.toLowerCase().includes(p))) return "Erro: Nome inválido";

  const url   = "https://api.clickup.com/api/v2/list/" + CLICKUP_LIST_ID_FIN + "/task";
  const corpo = {
    name: "FISCAL: " + evento,
    description:
      "Emitir nota fiscal para este evento.\n\n" +
      "💰 Custo Total de Materiais: R$ " + (Number(custoTotal) || 0).toFixed(2) + "\n\n" +
      "📦 Itens que exigem NF:\n" + listaNF.join("\n"),
    status: "to do", priority: 2, assignees: [assigneeId]
  };

  try {
    const res  = UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", headers: { "Authorization": token }, payload: JSON.stringify(corpo), muteHttpExceptions: true });
    const code = res.getResponseCode();
    const json = JSON.parse(res.getContentText());
    if (code !== 200 && code !== 201) return "Erro API (HTTP " + code + "): " + (json.err || "");
    return json.url || "Tarefa criada";
  } catch (e) {
    return "Erro Conexão: " + e.message;
  }
}

// ── Token ─────────────────────────────────────────────────────────────────────
function _getToken() {
  return PropertiesService.getScriptProperties().getProperty("CLICKUP_TOKEN") || null;
}

function configurarToken() {
  const TOKEN = "pk_112031875_MRHK2KV5GC8TNZYDTZIFOYNXMBBRMYKM";
  if (!TOKEN) { console.error("❌ Preencha o TOKEN."); return; }
  PropertiesService.getScriptProperties().setProperty("CLICKUP_TOKEN", TOKEN);
  console.log("✅ Token salvo.");
}

function testarTokenClickUp() {
  const token = _getToken();
  if (!token) { console.error("❌ Token não encontrado."); return; }
  const res  = UrlFetchApp.fetch("https://api.clickup.com/api/v2/list/" + CLICKUP_LIST_ID_FIN + "/member", { method: "get", headers: { "Authorization": token }, muteHttpExceptions: true });
  const json = JSON.parse(res.getContentText());
  if (res.getResponseCode() === 200) {
    console.log("✅ Token válido. Membros:");
    (json.members || []).forEach((m) => console.log("  ID: " + m.id + " | " + m.username));
  } else {
    console.error("❌ Token inválido. HTTP " + res.getResponseCode());
  }
}

// ── Sync de usuários ──────────────────────────────────────────────────────────
function sincronizarUsuariosClickUp() {
  const token = _getToken();
  if (!token) { console.error("❌ Token não encontrado."); return; }

  const ss    = SpreadsheetApp.openById(getIdPlanilha("MASTER"));
  let shUsers = ss.getSheetByName("USERS") || ss.insertSheet("USERS");

  shUsers.getRange(1, 1, 1, 4).setValues([["Email", "Nome", "Area", "ID_CLICKUP"]]);

  try {
    const res  = UrlFetchApp.fetch("https://api.clickup.com/api/v2/list/" + CLICKUP_LIST_ID_FIN + "/member", { method: "get", headers: { "Authorization": token }, muteHttpExceptions: true });
    const json = JSON.parse(res.getContentText());
    if (res.getResponseCode() !== 200) { console.error("❌ Erro API ClickUp."); return; }

    const linhas = (json.members || []).map((m) => [m.email || "", m.username || "", "", m.id || ""]);
    if (linhas.length === 0) { console.warn("⚠️ Nenhum membro retornado."); return; }

    const ultima = shUsers.getLastRow();
    if (ultima > 1) shUsers.getRange(2, 1, ultima - 1, 4).clearContent();
    shUsers.getRange(2, 1, linhas.length, 4).setValues(linhas);
    SpreadsheetApp.flush();
    console.log("✅ USERS sincronizado. " + linhas.length + " membros.");
  } catch (e) {
    console.error("❌ Erro de conexão: " + e.message);
  }
}
