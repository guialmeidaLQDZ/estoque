/**
 * ============================================================
 * LIQUIDZ — FINANCEIRO.gs
 * Sprint: 9 de março | Versão: 4.0
 * Função: Agrupa pedidos por evento, calcula custos e cria
 *         tarefas no ClickUp para a Fernanda (NF)
 * ============================================================
 *
 * CORREÇÕES APLICADAS NESTA VERSÃO:
 * [FIX-1] Token ClickUp movido para PropertiesService (seguro)
 * [FIX-2] Evento com itens em ERRO não bloqueia mais o agrupamento:
 *         só itens com statusLogistica === "ENVIADO" entram no lote
 * [FIX-3] flush() movido para fora do loop de eventos
 * [FIX-4] Proteção reforçada contra nomes de evento inválidos
 * [FIX-5] Função de diagnóstico do token mantida e melhorada
 *
 * SETUP INICIAL (fazer uma única vez):
 *   1. Abra o editor do script
 *   2. Acesse Projeto > Propriedades do projeto > Propriedades do script
 *   3. Adicione a chave: CLICKUP_TOKEN | valor: pk_112031875_...
 *   Após isso, o token não aparece mais no código-fonte.
 */

// ── Constantes não-sensíveis ──────────────────────────────────────────────────
const ID_PLANILHA_MASTER_FIN = "1yCK8TlPShu9QwNd5O9pg3izDAHwgxpov1zMgDGC17n4"; // fix: openById para funcionar em triggers de tempo
const CLICKUP_LIST_ID_FIN  = "901324926196";
const ID_PLANILHA_SETUP_FIN = "1B6QBQC6dCkIj44EAn0v5fIHAgzLvluC5F7W2dvv_N7k";
const FERNANDA_ID_FIN       = 105990268;

// Padrões que indicam valor inválido no campo evento
const EVENTOS_INVALIDOS = ["[object object]", "undefined", "null", "#ref!", "#value!", "#n/a"];

// ── Função principal ──────────────────────────────────────────────────────────
function processarFinanceiroEClickUp() {
  const token = _getToken();
  if (!token) {
    console.error("❌ Token ClickUp não configurado. Veja instruções no topo do arquivo.");
    return;
  }

  const ss = SpreadsheetApp.openById(ID_PLANILHA_MASTER_FIN);
  const shHist   = ss.getSheetByName("HISTORICO_MOVIMENTACAO");
  const shResumo = ss.getSheetByName("RESUMO_FINANCEIRO") || ss.insertSheet("RESUMO_FINANCEIRO");

  if (!shHist) {
    console.error("❌ Aba HISTORICO_MOVIMENTACAO não encontrada.");
    return;
  }

  // ── Carrega planilha de Setup (preços e flag NF) ──────────────────────────
  let shSetup;
  try {
    const ssSetup = SpreadsheetApp.openById(ID_PLANILHA_SETUP_FIN);
    shSetup = ssSetup.getSheetByName("Setup Itens e Produtos");
    if (!shSetup) throw new Error("Aba 'Setup Itens e Produtos' não encontrada.");
  } catch (e) {
    console.error("❌ Erro ao acessar Planilha de Setup: " + e.message);
    return;
  }

  // ── Leitura única de todas as abas ────────────────────────────────────────
  const dadosHist   = shHist.getDataRange().getValues();
  const dadosSetup  = shSetup.getDataRange().getValues();
  const dadosResumo = shResumo.getDataRange().getValues();

  // Mapa de eventos já no RESUMO_FINANCEIRO → { linhaOriginal, concluido }
  let mapaResumo = {};
  for (let i = 1; i < dadosResumo.length; i++) {
    const nomeEv = dadosResumo[i][1] ? String(dadosResumo[i][1]).trim() : "";
    const link   = dadosResumo[i][4] ? String(dadosResumo[i][4]) : "";
    if (nomeEv) {
      mapaResumo[nomeEv] = {
        linhaOriginal: i + 1,
        concluido: link.startsWith("http")
      };
    }
  }

  // Mapa de setup: SKU → { nome, preco, precisaNF }
  let mapaSetup = {};
  for (let i = 1; i < dadosSetup.length; i++) {
    const sku = dadosSetup[i][2] ? String(dadosSetup[i][2]).trim().toUpperCase() : "";
    if (sku) {
      mapaSetup[sku] = {
        nome:      dadosSetup[i][3] || "Item sem nome",
        preco:     parseFloat(dadosSetup[i][4]) || 0,
        precisaNF: String(dadosSetup[i][5] || "").toUpperCase().trim() === "SIM"
      };
    }
  }

  // ── Agrupa pedidos pendentes por evento ───────────────────────────────────
  // [FIX-2] Só itens com statusLogistica === "ENVIADO" entram no grupo.
  // Itens com ERRO não bloqueiam o processamento do evento.
  let pedidosPendentes = {};

  for (let i = 1; i < dadosHist.length; i++) {
    const row = dadosHist[i];
    const skuRaw = row[2];
    if (!skuRaw || skuRaw === "SKU") continue;

    const sku              = String(skuRaw).trim().toUpperCase();
    const nomeEvento       = row[9] ? String(row[9]).trim() : "";
    const statusLogistica  = row[10] ? String(row[10]).trim() : "";
    const statusFinanceiro = row[11] ? String(row[11]).trim() : "";

    // [FIX-4] Rejeita nomes de evento com padrões inválidos
    if (!nomeEvento || EVENTOS_INVALIDOS.some((p) => nomeEvento.toLowerCase().includes(p))) continue;

    // Pula se o evento já foi concluído no RESUMO
    if (mapaResumo[nomeEvento] && mapaResumo[nomeEvento].concluido) continue;

    // Só processa se logística ENVIADO e financeiro ainda não PROCESSADO
    if (statusLogistica !== "ENVIADO" || statusFinanceiro === "PROCESSADO") continue;

    if (!pedidosPendentes[nomeEvento]) {
      pedidosPendentes[nomeEvento] = { itens: [], indices: [] };
    }

    pedidosPendentes[nomeEvento].itens.push({
      sku: sku,
      qtd: Math.abs(Number(row[4]) || 0),
      info: mapaSetup[sku] || null
    });
    pedidosPendentes[nomeEvento].indices.push(i + 1);
  }

  const nomesEventos = Object.keys(pedidosPendentes);
  if (nomesEventos.length === 0) {
    console.log("ℹ️ Nenhum evento pendente para processar.");
    return;
  }

  console.log("📋 Eventos a processar: " + nomesEventos.length);

  // ── Processa cada evento ──────────────────────────────────────────────────
  let totalSucesso = 0;
  let totalErro    = 0;

  for (const nome of nomesEventos) {
    const pedido = pedidosPendentes[nome];
    let listaNF = [];
    let custoTotalMateriais = 0;

    pedido.itens.forEach((item) => {
      const precoUnit = item.info ? item.info.preco : 0;
      custoTotalMateriais += item.qtd * precoUnit;
      if (item.info && item.info.precisaNF) {
        listaNF.push("- " + item.qtd + "x " + item.info.nome + " (SKU: " + item.sku + ")");
      }
    });

    // Cria tarefa no ClickUp apenas se houver itens que precisam de NF
    let linkClickUp = "N/A";
    if (listaNF.length > 0) {
      linkClickUp = _criarTarefaClickUp(token, nome, listaNF, custoTotalMateriais);
    }

    const precisaNF  = listaNF.length > 0 ? "SIM" : "NÃO";
    const custoFmt   = custoTotalMateriais;
    const sucesso    = !linkClickUp.startsWith("Erro");

    // Atualiza ou adiciona linha no RESUMO_FINANCEIRO
    if (mapaResumo[nome]) {
      const linha = mapaResumo[nome].linhaOriginal;
      shResumo.getRange(linha, 3).setValue(custoFmt);
      shResumo.getRange(linha, 4).setValue(precisaNF);
      shResumo.getRange(linha, 5).setValue(linkClickUp);
    } else {
      shResumo.appendRow([new Date(), nome, custoFmt, precisaNF, linkClickUp]);
    }

    // Marca linhas do histórico como PROCESSADO (só se não houve erro no ClickUp)
    if (sucesso) {
      pedido.indices.forEach((idx) => {
        shHist.getRange(idx, 12).setValue("PROCESSADO"); // Col L
      });
      totalSucesso++;
      console.log("✅ Evento processado: " + nome + " | NF: " + precisaNF + " | Custo: R$ " + custoTotalMateriais.toFixed(2));
    } else {
      totalErro++;
      console.error("❌ Falha ao criar tarefa ClickUp para: " + nome + " | " + linkClickUp);
    }
  }

  // [FIX-3] Um único flush ao final de todos os eventos
  SpreadsheetApp.flush();

  console.log("──────────────────────────────────");
  console.log("FINANCEIRO CONCLUÍDO");
  console.log("Eventos com sucesso: " + totalSucesso);
  console.log("Eventos com erro: " + totalErro);
  console.log("──────────────────────────────────");
}

// ── Cria tarefa no ClickUp ────────────────────────────────────────────────────
function _criarTarefaClickUp(token, evento, listaNF, custoTotal) {
  if (!evento || EVENTOS_INVALIDOS.some((p) => evento.toLowerCase().includes(p))) {
    return "Erro: Nome de evento inválido";
  }

  const itensFormatados = listaNF.join("\n");
  const custoFormatado  = (Number(custoTotal) || 0).toFixed(2);
  const url = "https://api.clickup.com/api/v2/list/" + CLICKUP_LIST_ID_FIN + "/task";

  const corpo = {
    name: "FISCAL: " + evento,
    description:
      "Emitir nota fiscal para este evento.\n\n" +
      "💰 Custo Total de Materiais: R$ " + custoFormatado + "\n\n" +
      "📦 Itens que exigem NF:\n" + itensFormatados,
    status: "to do",
    priority: 2,
    assignees: [FERNANDA_ID_FIN]
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { "Authorization": token },
    payload: JSON.stringify(corpo),
    muteHttpExceptions: true
  };

  try {
    const res  = UrlFetchApp.fetch(url, options);
    const code = res.getResponseCode();
    const json = JSON.parse(res.getContentText());

    if (code !== 200 && code !== 201) {
      return "Erro API (HTTP " + code + "): " + (json.err || "resposta inesperada");
    }
    return json.url || "Tarefa criada (sem URL retornada)";
  } catch (e) {
    return "Erro Conexão: " + e.message;
  }
}

// ── Recupera token com segurança ──────────────────────────────────────────────
function _getToken() {
  // Tenta PropertiesService primeiro (recomendado)
  const props = PropertiesService.getScriptProperties();
  const tokenSalvo = props.getProperty("CLICKUP_TOKEN");
  if (tokenSalvo) return tokenSalvo;

  return null; // fix: sem fallback hardcoded — configure via configurarToken()
}

// ── Diagnóstico: testa o token e lista as assignees disponíveis ───────────────
function testarTokenClickUp() {
  const token = _getToken();
  if (!token) {
    console.error("❌ Token não encontrado.");
    return;
  }

  const url = "https://api.clickup.com/api/v2/list/" + CLICKUP_LIST_ID_FIN + "/member";
  const options = {
    method: "get",
    headers: { "Authorization": token },
    muteHttpExceptions: true
  };

  try {
    const res  = UrlFetchApp.fetch(url, options);
    const code = res.getResponseCode();
    const json = JSON.parse(res.getContentText());

    if (code === 200) {
      console.log("✅ Token válido. Membros da lista:");
      (json.members || []).forEach((m) => {
        console.log("  ID: " + m.id + " | Nome: " + m.username + " | Email: " + m.email);
      });
    } else {
      console.error("❌ Token inválido ou sem permissão. HTTP " + code + ": " + JSON.stringify(json));
    }
  } catch (e) {
    console.error("❌ Erro de conexão: " + e.message);
  }
}

// ── Setup: salva o token nas propriedades do script (rodar uma única vez) ──────
function configurarToken() {
  // Cole o token abaixo, rode UMA VEZ, depois apague o valor desta linha
  const TOKEN = "pk_112031875_MRHK2KV5GC8TNZYDTZIFOYNXMBBRMYKM"; // substitua pelo token e rode uma única vez
  if (!TOKEN) { console.error("❌ Preencha o TOKEN antes de rodar."); return; }
  PropertiesService.getScriptProperties().setProperty("CLICKUP_TOKEN", TOKEN);
  console.log("✅ Token salvo com segurança nas Propriedades do Script.");
}

// ── Sync de usuários: popula a aba USERS com membros do ClickUp ──────────────
// Rodar uma única vez (ou quando quiser atualizar a lista de membros).
// Estrutura: Email (chave) | Nome | Área | ID ClickUp
function sincronizarUsuariosClickUp() {
  const token = _getToken();
  if (!token) {
    console.error("❌ Token não encontrado.");
    return;
  }

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let shUsers = ss.getSheetByName("USERS");

  if (!shUsers) {
    shUsers = ss.insertSheet("USERS");
    console.log("ℹ️ Aba USERS criada automaticamente.");
  }

  // Garante cabeçalho correto na linha 1
  shUsers.getRange(1, 1, 1, 4).setValues([["Email", "Nome", "Area", "ID_CLICKUP"]]);

  // Busca membros da lista no ClickUp
  const url = "https://api.clickup.com/api/v2/list/" + CLICKUP_LIST_ID_FIN + "/member";
  const options = {
    method: "get",
    headers: { "Authorization": token },
    muteHttpExceptions: true
  };

  let membros;
  try {
    const res  = UrlFetchApp.fetch(url, options);
    const code = res.getResponseCode();
    const json = JSON.parse(res.getContentText());

    if (code !== 200) {
      console.error("❌ Erro na API ClickUp. HTTP " + code + ": " + JSON.stringify(json));
      return;
    }
    membros = json.members || [];
  } catch (e) {
    console.error("❌ Erro de conexão: " + e.message);
    return;
  }

  if (membros.length === 0) {
    console.warn("⚠️ Nenhum membro retornado pela API.");
    return;
  }

  // Monta array de saída: Email | Nome | Área (vazio) | ID
  const linhas = membros.map((m) => [
    m.email    || "",
    m.username || "",
    "",           // Área — preencher manualmente
    m.id       || ""
  ]);

  // Limpa dados antigos (mantém cabeçalho) e regrava
  const ultimaLinha = shUsers.getLastRow();
  if (ultimaLinha > 1) {
    shUsers.getRange(2, 1, ultimaLinha - 1, 4).clearContent();
  }
  shUsers.getRange(2, 1, linhas.length, 4).setValues(linhas);
  SpreadsheetApp.flush();

  console.log("✅ USERS sincronizado. " + linhas.length + " membros gravados.");
}