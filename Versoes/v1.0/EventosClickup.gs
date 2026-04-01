/**
 * MÓDULO: EVENTOS CLICKUP (V1.0)
 * Integração entre SOLICITACOES_HEADER / SOLICITACOES_PDF e ClickUp.
 *
 * FLUXO:
 * 1. Nova linha em SOLICITACOES_HEADER sem ID_ClickUp_Task
 *    → Cria card no ClickUp atribuído ao Responsável escolhido
 *    → Salva ID da task na coluna J
 *
 * 2. Linha em SOLICITACOES_HEADER com Status = APROVADO e ID_ClickUp_Task preenchido
 *    → Atualiza descrição do card com a lista de itens do pedido
 *
 * 3. Linha em SOLICITACOES_PDF com Status = GERADO e SUBTAREFA_CRIADA vazio
 *    → Cria subtarefa atribuída ao Hélio com o link do PDF
 *    → Marca coluna G como CRIADA
 *
 * COLUNAS NECESSÁRIAS:
 * SOLICITACOES_HEADER: ..., J=ID_ClickUp_Task, K=Responsável
 * SOLICITACOES_PDF:    ..., G=SUBTAREFA_CRIADA
 * USERS:               A=email, B=nome, C=area, D=ID_CLICKUP
 */

// ============================================================
// CONSTANTES
// ============================================================
const CU_TOKEN_EVENTOS   = PropertiesService.getScriptProperties().getProperty("CLICKUP_TOKEN"); // fix: token seguro
const CU_LIST_EVENTOS    = "901312037051";
const CU_HELIO_ID        = 111907761;

// ============================================================
// FUNÇÃO PRINCIPAL — chame via gatilho de tempo (a cada 5 min)
// ============================================================
function processarEventosClickUp() {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { console.log("Aguardando outra execução..."); return; }

  try {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const shHeader  = ss.getSheetByName("SOLICITACOES_HEADER");
  const shItens   = ss.getSheetByName("SOLICITACOES_ITENS");
  const shPDF     = ss.getSheetByName("SOLICITACOES_PDF");
  const shUsers   = ss.getSheetByName("USERS");

  if (!shHeader || !shItens || !shPDF || !shUsers) {
    console.error("❌ Aba não encontrada. Verifique: SOLICITACOES_HEADER, SOLICITACOES_ITENS, SOLICITACOES_PDF, USERS.");
    return; // fix: finally libera o lock
  }

  // Monta dicionário de usuários: nome (lowercase) → ID_ClickUp
  // USERS: A=email, B=nome, C=area, D=ID_CLICKUP
  const dadosUsers = shUsers.getDataRange().getValues();
  let mapaUsers = {};
  for (let i = 1; i < dadosUsers.length; i++) {
    let nome = dadosUsers[i][1] ? dadosUsers[i][1].toString().trim().toLowerCase() : "";
    let id   = dadosUsers[i][3] ? parseInt(dadosUsers[i][3]) : null;
    if (nome && id) mapaUsers[nome] = id;
  }

  // Monta índice de itens por ID_Pedido
  // SOLICITACOES_ITENS: A=ID_Linha, B=ID_Pedido, C=SKU, D=Nome_Item, E=Quantidade, F=local_de_retirada, G=Categoria_Uso
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

  // ─── PASSO 1 e 2: Processa SOLICITACOES_HEADER ───────────────────────────
  // SOLICITACOES_HEADER: A=ID_Pedido, B=Data, C=Solicitante, D=Area, E=Evento,
  //                      F=Tipo_Movimento, G=Status, H=local_de_retirada,
  //                      I=ID_PROJETO, J=ID_ClickUp_Task, K=Responsável
  const dadosHeader = shHeader.getDataRange().getValues();

  for (let i = 1; i < dadosHeader.length; i++) {
    let row          = dadosHeader[i];
    let idPedido     = row[0] ? row[0].toString().trim() : "";
    let data         = row[1];
    let solicitante  = row[2] ? row[2].toString().trim() : "";
    let area         = row[3] ? row[3].toString().trim() : "";
    let evento       = row[4] ? row[4].toString().trim() : "";
    let tipo         = row[5] ? row[5].toString().trim() : "";
    let status       = row[6] ? row[6].toString().trim().toUpperCase() : "";
    let cdOrigem     = row[7] ? row[7].toString().trim() : "";
    let taskId       = row[9] ? row[9].toString().trim() : ""; // Coluna J
    let responsavel  = row[10] ? row[10].toString().trim() : ""; // Coluna K

    if (!idPedido || !evento) continue;

    // PASSO 1: Criar card se ainda não tem ID_ClickUp_Task
    if (!taskId) {
      let responsavelId = mapaUsers[responsavel.toLowerCase()] || null;
      let novoTaskId    = criarCardEvento(evento, solicitante, area, tipo, cdOrigem, data, idPedido, responsavelId);
      if (novoTaskId) {
        shHeader.getRange(i + 1, 10).setValue(novoTaskId); // Coluna J
        taskId = novoTaskId;
        console.log("✅ Card criado para evento: " + evento + " → Task ID: " + taskId);
      }
      continue; // Na próxima execução atualiza descrição se já aprovado
    }

    // PASSO 2: Atualizar descrição quando aprovado
    if (status === "APROVADO") {
      let itens = itensPorPedido[idPedido] || [];
      if (itens.length > 0) {
        atualizarDescricaoCard(taskId, evento, solicitante, area, tipo, cdOrigem, data, idPedido, itens);
        console.log("✅ Descrição atualizada para pedido: " + idPedido + " no card: " + taskId);
      }
    }
  }

  // ─── PASSO 3: Processa SOLICITACOES_PDF → Subtarefa do Hélio ─────────────
  // SOLICITACOES_PDF: A=ID, B=Nome_Evento, C=Solicitante, D=Status, E=Link_PDF, F=Data_Geração, G=SUBTAREFA_CRIADA
  const dadosPDF = shPDF.getDataRange().getValues();

  // Monta índice: Nome_Evento → ID_ClickUp_Task (da header)
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
    let subtarefaCriada = row[6] ? row[6].toString().trim() : ""; // Coluna G

    if (status !== "GERADO" || !linkPDF || subtarefaCriada === "CRIADA") continue;

    let taskIdEvento = taskIdPorEvento[nomeEvento];
    if (!taskIdEvento) {
      console.warn("⚠️ Nenhum card ClickUp encontrado para o evento: " + nomeEvento);
      continue;
    }

    let subtaskId = criarSubtarefaHelio(taskIdEvento, nomeEvento, linkPDF, solicitante);
    if (subtaskId) {
      shPDF.getRange(i + 1, 7).setValue("CRIADA"); // Coluna G
      console.log("✅ Subtarefa do Hélio criada para: " + nomeEvento);
    }
  }

  SpreadsheetApp.flush(); // fix: único flush após os loops

  } finally {
    lock.releaseLock(); // fix: sempre liberado mesmo em erro
  }
}

// ============================================================
// CRIA CARD DO EVENTO NO CLICKUP
// ============================================================
function criarCardEvento(evento, solicitante, area, tipo, cdOrigem, data, idPedido, responsavelId) {
  let dataFormatada = data ? Utilities.formatDate(new Date(data), Session.getScriptTimeZone(), "dd/MM/yyyy") : "-";

  let descricao =
    "📦 PEDIDO DE ITENS — " + evento + "\n\n" +
    "Solicitante: " + (solicitante || "-") + "\n" +
    "Área: " + (area || "-") + "\n" +
    "CD de Origem: " + (cdOrigem || "-") + "\n" +
    "Tipo de Movimento: " + (tipo || "-") + "\n" +
    "Data: " + dataFormatada + "\n" +
    "ID do Pedido: " + idPedido + "\n\n" +
    "⏳ Itens serão listados após aprovação do pedido.";

  let assignees = responsavelId ? [responsavelId] : [];

  let corpo = {
    name:        "EVENTO: " + evento,
    description: descricao,
    status:      "to do",
    priority:    3,
    assignees:   assignees
  };

  let res = _chamarClickUp("POST", "/list/" + CU_LIST_EVENTOS + "/task", corpo);
  return res && res.id ? res.id : null;
}

// ============================================================
// ATUALIZA DESCRIÇÃO DO CARD COM OS ITENS DO PEDIDO
// ============================================================
function atualizarDescricaoCard(taskId, evento, solicitante, area, tipo, cdOrigem, data, idPedido, itens) {
  // Busca a descrição atual para acumular pedidos
  let resGet = _chamarClickUp("GET", "/task/" + taskId, null);
  let descAtual = resGet && resGet.description ? resGet.description : "";

  let dataFormatada = data ? Utilities.formatDate(new Date(data), Session.getScriptTimeZone(), "dd/MM/yyyy") : "-";

  // Remove a linha de "aguardando aprovação" se existir
  descAtual = descAtual.replace("⏳ Itens serão listados após aprovação do pedido.", "").trim();

  // Monta bloco do novo pedido
  let linhasItens = itens.map(item =>
    "  • [" + item.categoria + "] " + item.nome + " (SKU: " + item.sku + ") — Qtd: " + item.qtd
  ).join("\n");

  let blocoNovo =
    "\n\n─────────────────────────────\n" +
    "📋 Pedido: " + idPedido + " | Data: " + dataFormatada + "\n" +
    linhasItens;

  // Verifica se esse pedido já foi adicionado à descrição
  if (descAtual.includes("Pedido: " + idPedido)) return;

  let novaDescricao = descAtual + blocoNovo;

  _chamarClickUp("PUT", "/task/" + taskId, { description: novaDescricao });
}

// ============================================================
// CRIA SUBTAREFA DO HÉLIO COM O LINK DO PDF
// ============================================================
function criarSubtarefaHelio(taskIdPai, nomeEvento, linkPDF, solicitante) {
  let corpo = {
    name:        "PDF Itens — " + nomeEvento,
    description: "PDF de itens do evento gerado e disponível para conferência.\n\nEvento: " + nomeEvento + "\nSolicitante: " + (solicitante || "-") + "\n\n🔗 Link do PDF:\n" + linkPDF,
    status:      "to do",
    priority:    2,
    assignees:   [CU_HELIO_ID]
  };

  let res = _chamarClickUp("POST", "/task/" + taskIdPai + "/subtask", corpo);
  return res && res.id ? res.id : null;
}

// ============================================================
// HELPER: CHAMADA À API DO CLICKUP
// ============================================================
function _chamarClickUp(metodo, endpoint, corpo) {
  const url = "https://api.clickup.com/api/v2" + endpoint;
  let opcoes = {
    method:           metodo,
    headers:          { "Authorization": CU_TOKEN_EVENTOS, "Content-Type": "application/json" },
    muteHttpExceptions: true
  };
  if (corpo) opcoes.payload = JSON.stringify(corpo);

  try {
    let res  = UrlFetchApp.fetch(url, opcoes);
    let json = JSON.parse(res.getContentText());
    if (res.getResponseCode() !== 200 && res.getResponseCode() !== 201) {
      console.error("❌ ClickUp API erro [" + metodo + " " + endpoint + "]: " + res.getContentText());
      return null;
    }
    return json;
  } catch (e) {
    console.error("❌ Erro de conexão ClickUp: " + e.message);
    return null;
  }
}
