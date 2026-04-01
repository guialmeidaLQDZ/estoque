/**
 * ============================================================
 * LIQUIDZ — EVENTOSCLICKUP.gs — Projeto v1.1
 * ============================================================
 *
 * Changelog v1.1:
 * [BUG-01] getActiveSpreadsheet() → openById()
 * [TESTE]  IDs lidos via getIdPlanilha() — suporta ambiente producao/teste
 */

// ── Constantes ────────────────────────────────────────────────────────────────
const CU_TOKEN_EVENTOS = PropertiesService.getScriptProperties().getProperty("CLICKUP_TOKEN");
const CU_LIST_EVENTOS  = "901312037051";
const CU_HELIO_ID      = 111907761;

// ── Função principal ──────────────────────────────────────────────────────────
function processarEventosClickUp() {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { console.log("Aguardando outra execução..."); return; }

  try {
    console.log("🌍 Ambiente: " + getAmbiente());

    const ss       = SpreadsheetApp.openById(getIdPlanilha("MASTER"));
    const shHeader = ss.getSheetByName("SOLICITACOES_HEADER");
    const shItens  = ss.getSheetByName("SOLICITACOES_ITENS");
    const shPDF    = ss.getSheetByName("SOLICITACOES_PDF");
    const shUsers  = ss.getSheetByName("USERS");

    if (!shHeader || !shItens || !shPDF || !shUsers) {
      console.error("❌ Aba não encontrada. Verifique: SOLICITACOES_HEADER, SOLICITACOES_ITENS, SOLICITACOES_PDF, USERS.");
      return;
    }

    const dadosUsers = shUsers.getDataRange().getValues();
    let mapaUsers = {};
    for (let i = 1; i < dadosUsers.length; i++) {
      let nome = dadosUsers[i][1] ? dadosUsers[i][1].toString().trim().toLowerCase() : "";
      let id   = dadosUsers[i][3] ? parseInt(dadosUsers[i][3]) : null;
      if (nome && id) mapaUsers[nome] = id;
    }

    const dadosItens = shItens.getDataRange().getValues();
    let itensPorPedido = {};
    for (let i = 1; i < dadosItens.length; i++) {
      let row      = dadosItens[i];
      let idPedido = row[1] ? row[1].toString().trim() : "";
      if (!idPedido) continue;
      if (!itensPorPedido[idPedido]) itensPorPedido[idPedido] = [];
      itensPorPedido[idPedido].push({
        sku:       row[2] ? row[2].toString().trim() : "",
        nome:      row[3] ? row[3].toString().trim() : "",
        qtd:       row[4] || 0,
        categoria: row[6] ? row[6].toString().trim() : ""
      });
    }

    const dadosHeader = shHeader.getDataRange().getValues();

    for (let i = 1; i < dadosHeader.length; i++) {
      let row         = dadosHeader[i];
      let idPedido    = row[0] ? row[0].toString().trim() : "";
      let data        = row[1];
      let solicitante = row[2] ? row[2].toString().trim() : "";
      let area        = row[3] ? row[3].toString().trim() : "";
      let evento      = row[4] ? row[4].toString().trim() : "";
      let tipo        = row[5] ? row[5].toString().trim() : "";
      let status      = row[6] ? row[6].toString().trim().toUpperCase() : "";
      let cdOrigem    = row[7] ? row[7].toString().trim() : "";
      let taskId      = row[9]  ? row[9].toString().trim()  : "";
      let responsavel = row[10] ? row[10].toString().trim() : "";

      if (!idPedido || !evento) continue;

      if (!taskId) {
        let novoTaskId = criarCardEvento(evento, solicitante, area, tipo, cdOrigem, data, idPedido, mapaUsers[responsavel.toLowerCase()] || null);
        if (novoTaskId) {
          shHeader.getRange(i + 1, 10).setValue(novoTaskId);
          console.log("✅ Card criado: " + evento + " → " + novoTaskId);
        }
        continue;
      }

      if (status === "APROVADO") {
        let itens = itensPorPedido[idPedido] || [];
        if (itens.length > 0) {
          atualizarDescricaoCard(taskId, evento, solicitante, area, tipo, cdOrigem, data, idPedido, itens);
          console.log("✅ Descrição atualizada: " + idPedido);
        }
      }
    }

    const dadosPDF = shPDF.getDataRange().getValues();
    let taskIdPorEvento = {};
    for (let i = 1; i < dadosHeader.length; i++) {
      let evento = dadosHeader[i][4] ? dadosHeader[i][4].toString().trim() : "";
      let taskId = dadosHeader[i][9] ? dadosHeader[i][9].toString().trim() : "";
      if (evento && taskId) taskIdPorEvento[evento] = taskId;
    }

    for (let i = 1; i < dadosPDF.length; i++) {
      let row             = dadosPDF[i];
      let nomeEvento      = row[1] ? row[1].toString().trim() : "";
      let solicitante     = row[2] ? row[2].toString().trim() : "";
      let status          = row[3] ? row[3].toString().trim().toUpperCase() : "";
      let linkPDF         = row[4] ? row[4].toString().trim() : "";
      let subtarefaCriada = row[6] ? row[6].toString().trim() : "";

      if (status !== "GERADO" || !linkPDF || subtarefaCriada === "CRIADA") continue;

      let taskIdEvento = taskIdPorEvento[nomeEvento];
      if (!taskIdEvento) { console.warn("⚠️ Nenhum card encontrado para: " + nomeEvento); continue; }

      let subtaskId = criarSubtarefaHelio(taskIdEvento, nomeEvento, linkPDF, solicitante);
      if (subtaskId) {
        shPDF.getRange(i + 1, 7).setValue("CRIADA");
        console.log("✅ Subtarefa Hélio criada: " + nomeEvento);
      }
    }

    SpreadsheetApp.flush();

  } finally {
    lock.releaseLock();
  }
}

// ── Funções de integração ClickUp ─────────────────────────────────────────────

function criarCardEvento(evento, solicitante, area, tipo, cdOrigem, data, idPedido, responsavelId) {
  let dataFmt = data ? Utilities.formatDate(new Date(data), Session.getScriptTimeZone(), "dd/MM/yyyy") : "-";
  let corpo = {
    name: "EVENTO: " + evento,
    description:
      "📦 PEDIDO DE ITENS — " + evento + "\n\n" +
      "Solicitante: " + (solicitante || "-") + "\nÁrea: " + (area || "-") +
      "\nCD de Origem: " + (cdOrigem || "-") + "\nTipo: " + (tipo || "-") +
      "\nData: " + dataFmt + "\nID Pedido: " + idPedido +
      "\n\n⏳ Itens serão listados após aprovação.",
    status: "to do", priority: 3, assignees: responsavelId ? [responsavelId] : []
  };
  let res = _chamarClickUp("POST", "/list/" + CU_LIST_EVENTOS + "/task", corpo);
  return res && res.id ? res.id : null;
}

function atualizarDescricaoCard(taskId, evento, solicitante, area, tipo, cdOrigem, data, idPedido, itens) {
  let resGet    = _chamarClickUp("GET", "/task/" + taskId, null);
  let descAtual = resGet && resGet.description ? resGet.description : "";
  let dataFmt   = data ? Utilities.formatDate(new Date(data), Session.getScriptTimeZone(), "dd/MM/yyyy") : "-";

  descAtual = descAtual.replace("⏳ Itens serão listados após aprovação.", "").trim();
  if (descAtual.includes("Pedido: " + idPedido)) return;

  let linhasItens = itens.map(i => "  • [" + i.categoria + "] " + i.nome + " (SKU: " + i.sku + ") — Qtd: " + i.qtd).join("\n");
  _chamarClickUp("PUT", "/task/" + taskId, {
    description: descAtual + "\n\n─────────────────────────────\n📋 Pedido: " + idPedido + " | Data: " + dataFmt + "\n" + linhasItens
  });
}

function criarSubtarefaHelio(taskIdPai, nomeEvento, linkPDF, solicitante) {
  let res = _chamarClickUp("POST", "/task/" + taskIdPai + "/subtask", {
    name: "PDF Itens — " + nomeEvento,
    description: "PDF gerado.\n\nEvento: " + nomeEvento + "\nSolicitante: " + (solicitante || "-") + "\n\n🔗 " + linkPDF,
    status: "to do", priority: 2, assignees: [CU_HELIO_ID]
  });
  return res && res.id ? res.id : null;
}

function _chamarClickUp(metodo, endpoint, corpo) {
  const url    = "https://api.clickup.com/api/v2" + endpoint;
  let opcoes   = { method: metodo, headers: { "Authorization": CU_TOKEN_EVENTOS, "Content-Type": "application/json" }, muteHttpExceptions: true };
  if (corpo) opcoes.payload = JSON.stringify(corpo);
  try {
    let res  = UrlFetchApp.fetch(url, opcoes);
    let json = JSON.parse(res.getContentText());
    if (res.getResponseCode() !== 200 && res.getResponseCode() !== 201) {
      console.error("❌ ClickUp [" + metodo + " " + endpoint + "]: " + res.getContentText());
      return null;
    }
    return json;
  } catch (e) {
    console.error("❌ Erro ClickUp: " + e.message);
    return null;
  }
}
