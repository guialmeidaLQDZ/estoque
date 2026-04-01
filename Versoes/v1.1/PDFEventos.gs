/**
 * ============================================================
 * LIQUIDZ — PDFEVENTOS.gs — Projeto v1.1
 * USA DRIVE API REST — sem DriveApp ou DocumentApp.
 * Estilos 100% inline. Categorias: Bonificado=cinza, Vendido=verde, Infra/Retorno=azul
 * ============================================================
 *
 * Changelog v1.1:
 * [BUG-01] getActiveSpreadsheet() → openById()
 * [TESTE]  IDs lidos via getIdPlanilha() — suporta ambiente producao/teste
 */

// ── Constantes ────────────────────────────────────────────────────────────────
const ID_PASTA_PDFS        = "1sto_HdDLsdqtk39d2dvfgmXBURUb1Yuy";
const EMAILS_DESTINATARIOS = [];

// ── Função principal ──────────────────────────────────────────────────────────
function gerarPDFEventos() {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { console.log("Aguardando outra execução..."); return; }

  const ss       = SpreadsheetApp.openById(getIdPlanilha("MASTER"));
  const shPDF    = ss.getSheetByName("SOLICITACOES_PDF");
  const shHeader = ss.getSheetByName("SOLICITACOES_HEADER");
  const shItens  = ss.getSheetByName("SOLICITACOES_ITENS");

  if (!shPDF || !shHeader || !shItens) {
    console.error("❌ Aba não encontrada. Verifique: SOLICITACOES_PDF, SOLICITACOES_HEADER, SOLICITACOES_ITENS.");
    lock.releaseLock();
    return;
  }

  console.log("🌍 Ambiente: " + getAmbiente());

  try {
    const dadosPDF    = shPDF.getDataRange().getValues();
    const dadosHeader = shHeader.getDataRange().getValues();
    const dadosItens  = shItens.getDataRange().getValues();

    let pedidosPorEvento = {};
    for (let i = 1; i < dadosHeader.length; i++) {
      let row      = dadosHeader[i];
      let idPedido = row[0] ? row[0].toString().trim() : "";
      let evento   = row[4] ? row[4].toString().trim() : "";
      let status   = row[6] ? row[6].toString().trim().toUpperCase() : "";
      if (!idPedido || !evento || status !== "APROVADO") continue;
      if (!pedidosPorEvento[evento]) pedidosPorEvento[evento] = [];
      pedidosPorEvento[evento].push({
        idPedido: idPedido, data: row[1],
        solicitante: row[2] ? row[2].toString().trim() : "",
        area: row[3] ? row[3].toString().trim() : "",
        tipo: row[5] ? row[5].toString().trim() : "",
        cd: row[7] ? row[7].toString().trim() : ""
      });
    }

    let itensPorPedido = {};
    for (let i = 1; i < dadosItens.length; i++) {
      let row      = dadosItens[i];
      let idPedido = row[1] ? row[1].toString().trim() : "";
      if (!idPedido) continue;
      if (!itensPorPedido[idPedido]) itensPorPedido[idPedido] = [];
      itensPorPedido[idPedido].push({
        sku: row[2] ? row[2].toString().trim() : "",
        nome: row[3] ? row[3].toString().trim() : "",
        qtd: row[4] || 0,
        categoria: row[6] ? row[6].toString().trim() : "Sem Categoria"
      });
    }

    for (let i = 1; i < dadosPDF.length; i++) {
      let row    = dadosPDF[i];
      let status = row[3] ? row[3].toString().trim().toUpperCase() : "";
      if (status !== "PENDENTE") continue;

      let nomeEvento  = row[1] ? row[1].toString().trim() : "";
      let solicitante = row[2] ? row[2].toString().trim() : "";

      if (!nomeEvento) { shPDF.getRange(i + 1, 4).setValue("ERRO: Evento vazio"); continue; }

      let pedidosDoEvento = pedidosPorEvento[nomeEvento];
      if (!pedidosDoEvento || pedidosDoEvento.length === 0) {
        shPDF.getRange(i + 1, 4).setValue("ERRO: Nenhum pedido aprovado encontrado");
        continue;
      }

      try {
        let todosItens = [], cdOrigem = "", tipoMovimento = "", dataPedido = "";
        pedidosDoEvento.forEach(pedido => {
          (itensPorPedido[pedido.idPedido] || []).forEach(item => todosItens.push(item));
          if (!cdOrigem)      cdOrigem      = pedido.cd;
          if (!tipoMovimento) tipoMovimento = pedido.tipo;
          if (!dataPedido)    dataPedido    = pedido.data;
        });

        let itensMapa = {};
        todosItens.forEach(item => {
          let key = item.sku + "|" + item.categoria;
          if (!itensMapa[key]) itensMapa[key] = { nome: item.nome, qtd: 0, categoria: item.categoria, sku: item.sku };
          itensMapa[key].qtd += parseFloat(item.qtd) || 0;
        });
        let itensAgrupados = Object.values(itensMapa).sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome));

        let html    = gerarHTML(nomeEvento, solicitante, cdOrigem, tipoMovimento, dataPedido, itensAgrupados, pedidosDoEvento);
        let linkPDF = uploadEExportarPDF(html, nomeEvento);

        shPDF.getRange(i + 1, 4).setValue("GERADO");
        shPDF.getRange(i + 1, 5).setValue(linkPDF);
        shPDF.getRange(i + 1, 6).setValue(new Date());

        if (EMAILS_DESTINATARIOS.length > 0) enviarEmail(linkPDF, nomeEvento, solicitante, EMAILS_DESTINATARIOS);
        console.log("✅ PDF gerado: " + nomeEvento);

      } catch (e) {
        console.error("❌ Erro ao gerar PDF para " + nomeEvento + ": " + e.message);
        shPDF.getRange(i + 1, 4).setValue("ERRO: " + e.message);
      }
    }

    SpreadsheetApp.flush();

  } finally {
    lock.releaseLock();
  }
}

// ── Gera HTML — estilos 100% inline ──────────────────────────────────────────
function gerarHTML(nomeEvento, solicitante, cdOrigem, tipoMovimento, dataPedido, itens, pedidos) {
  let dataFmt    = dataPedido ? Utilities.formatDate(new Date(dataPedido), Session.getScriptTimeZone(), "dd/MM/yyyy") : Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  let dataGer    = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  let idsPedidos = pedidos.map(p => p.idPedido).join(", ");

  const COR = {
    "Bonificado":    { row: { bg: "#e0e0e0", txt: "#333333" }, hdr: { bg: "#757575", txt: "#ffffff" } },
    "Vendido":       { row: { bg: "#d4edda", txt: "#155724" }, hdr: { bg: "#1e7e34", txt: "#ffffff" } },
    "Infra/Retorno": { row: { bg: "#cce5ff", txt: "#003366" }, hdr: { bg: "#0056b3", txt: "#ffffff" } }
  };
  const CATS = ["Bonificado", "Vendido", "Infra/Retorno"];

  let blocos = "", totalGeral = 0;

  CATS.forEach(cat => {
    let itensCat = itens.filter(i => i.categoria === cat);
    if (!itensCat.length) return;
    let c        = COR[cat] || { row: { bg: "#f5f5f5", txt: "#333" }, hdr: { bg: "#444", txt: "#fff" } };
    let subtotal = itensCat.reduce((a, i) => a + i.qtd, 0);
    totalGeral  += subtotal;
    blocos +=
      '<tr><td colspan="3" style="padding:10px;background-color:' + c.hdr.bg + ';color:' + c.hdr.txt + ';font-weight:bold;font-size:13px;border:1px solid #ccc">' + cat.toUpperCase() + '</td></tr>' +
      itensCat.map(item =>
        '<tr>' +
          '<td style="padding:8px 10px;border:1px solid #ccc;color:' + c.row.txt + ';background-color:' + c.row.bg + '">' + item.sku + '</td>' +
          '<td style="padding:8px 10px;border:1px solid #ccc;color:' + c.row.txt + ';background-color:' + c.row.bg + '">' + item.nome + '</td>' +
          '<td style="padding:8px 10px;border:1px solid #ccc;color:' + c.row.txt + ';background-color:' + c.row.bg + ';text-align:center">' + item.qtd + '</td>' +
        '</tr>'
      ).join("") +
      '<tr><td colspan="2" style="padding:8px 10px;border:1px solid #ccc;background-color:#eee;font-weight:bold">Subtotal ' + cat + '</td><td style="padding:8px 10px;border:1px solid #ccc;background-color:#eee;font-weight:bold;text-align:center">' + subtotal + '</td></tr>';
  });

  let semCat = itens.filter(i => !CATS.includes(i.categoria));
  if (semCat.length) {
    let sub = semCat.reduce((a, i) => a + i.qtd, 0); totalGeral += sub;
    blocos +=
      '<tr><td colspan="3" style="padding:10px;background-color:#888;color:#fff;font-weight:bold;border:1px solid #ccc">OUTROS</td></tr>' +
      semCat.map(item => '<tr><td style="padding:8px 10px;border:1px solid #ccc;background-color:#f5f5f5">' + item.sku + '</td><td style="padding:8px 10px;border:1px solid #ccc;background-color:#f5f5f5">' + item.nome + '</td><td style="padding:8px 10px;border:1px solid #ccc;background-color:#f5f5f5;text-align:center">' + item.qtd + '</td></tr>').join("") +
      '<tr><td colspan="2" style="padding:8px 10px;border:1px solid #ccc;background-color:#eee;font-weight:bold">Subtotal Outros</td><td style="padding:8px 10px;border:1px solid #ccc;background-color:#eee;font-weight:bold;text-align:center">' + sub + '</td></tr>';
  }

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;margin:40px;color:#1a1a2e;background:#fff">' +
    '<h1 style="text-align:center;font-size:22px;color:#1a1a2e;border-bottom:3px solid #1a1a2e;padding-bottom:8px;margin-bottom:20px">LIQUIDZ — PDF ITENS DO EVENTO</h1>' +
    '<div style="background:#f9f9f9;border-left:4px solid #1a1a2e;padding:12px 16px;margin:16px 0;border-radius:4px">' +
      '<p style="margin:4px 0;font-size:13px"><strong>Evento:</strong> ' + nomeEvento + '</p>' +
      '<p style="margin:4px 0;font-size:13px"><strong>Solicitante:</strong> ' + (solicitante || "Não informado") + '</p>' +
      '<p style="margin:4px 0;font-size:13px"><strong>CD de Origem:</strong> ' + (cdOrigem || "Não informado") + '</p>' +
      '<p style="margin:4px 0;font-size:13px"><strong>Tipo de Movimento:</strong> ' + (tipoMovimento || "Não informado") + '</p>' +
      '<p style="margin:4px 0;font-size:13px"><strong>Data do Pedido:</strong> ' + dataFmt + '</p>' +
      '<p style="margin:4px 0;font-size:13px"><strong>Pedidos incluídos:</strong> ' + idsPedidos + '</p>' +
    '</div>' +
    '<h2 style="font-size:15px;color:#1a1a2e;margin-top:24px">ITENS SOLICITADOS</h2>' +
    '<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px">' +
      '<thead><tr>' +
        '<th style="padding:10px 8px;border:1px solid #ccc;background-color:#1a1a2e;color:#fff;text-align:left">SKU</th>' +
        '<th style="padding:10px 8px;border:1px solid #ccc;background-color:#1a1a2e;color:#fff;text-align:left">Nome do Item</th>' +
        '<th style="padding:10px 8px;border:1px solid #ccc;background-color:#1a1a2e;color:#fff;text-align:center">Quantidade</th>' +
      '</tr></thead>' +
      '<tbody>' + blocos +
        '<tr><td colspan="2" style="padding:10px;border:1px solid #ccc;background-color:#1a1a2e;color:#fff;font-weight:bold;font-size:14px">TOTAL GERAL</td>' +
        '<td style="padding:10px;border:1px solid #ccc;background-color:#1a1a2e;color:#fff;font-weight:bold;font-size:14px;text-align:center">' + totalGeral + '</td></tr>' +
      '</tbody>' +
    '</table>' +
    '<p style="text-align:center;font-size:10px;color:#999;margin-top:32px;font-style:italic">Gerado automaticamente pelo sistema Liquidz em ' + dataGer + '</p>' +
  '</body></html>';
}

// ── Upload HTML → Google Doc → exporta PDF ───────────────────────────────────
function uploadEExportarPDF(html, nomeEvento) {
  const token    = ScriptApp.getOAuthToken();
  const boundary = "liquidz_boundary_" + new Date().getTime();
  const nomeArq  = "PDF_Evento_" + nomeEvento.replace(/[^a-zA-Z0-9À-ú ]/g, "_") + "_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmm");

  const metaDados  = { name: "TEMP_" + nomeArq, mimeType: "application/vnd.google-apps.document" };
  const partesMeta = "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + JSON.stringify(metaDados) + "\r\n";
  const partesHTML = "--" + boundary + "\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n" + html + "\r\n--" + boundary + "--";

  let resUpload = UrlFetchApp.fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST", headers: { "Authorization": "Bearer " + token, "Content-Type": "multipart/related; boundary=" + boundary },
    payload: partesMeta + partesHTML, muteHttpExceptions: true
  });
  let docTemp = JSON.parse(resUpload.getContentText());
  if (!docTemp.id) throw new Error("Falha no upload: " + resUpload.getContentText());

  let resPDF = UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + docTemp.id + "/export?mimeType=application/pdf", {
    method: "GET", headers: { "Authorization": "Bearer " + token }, muteHttpExceptions: true
  });
  if (resPDF.getResponseCode() !== 200) throw new Error("Falha ao exportar PDF.");

  const metaPDF   = { name: nomeArq + ".pdf", parents: [ID_PASTA_PDFS] };
  const partesPDF = "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + JSON.stringify(metaPDF) + "\r\n--" + boundary + "\r\nContent-Type: application/pdf\r\n\r\n";
  const bodyBytes = Utilities.newBlob(partesPDF).getBytes().concat(resPDF.getBlob().getBytes()).concat(Utilities.newBlob("\r\n--" + boundary + "--").getBytes());

  let resSalvar = UrlFetchApp.fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true", {
    method: "POST", headers: { "Authorization": "Bearer " + token, "Content-Type": "multipart/related; boundary=" + boundary },
    payload: bodyBytes, muteHttpExceptions: true
  });
  let pdfSalvo = JSON.parse(resSalvar.getContentText());
  if (!pdfSalvo.id) throw new Error("Falha ao salvar PDF.");

  UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + pdfSalvo.id + "/permissions?supportsAllDrives=true", {
    method: "POST", headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
    payload: JSON.stringify({ role: "reader", type: "anyone" }), muteHttpExceptions: true
  });

  UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + docTemp.id, {
    method: "DELETE", headers: { "Authorization": "Bearer " + token }, muteHttpExceptions: true
  });

  return "https://drive.google.com/file/d/" + pdfSalvo.id + "/view";
}

// ── Email ─────────────────────────────────────────────────────────────────────
function enviarEmail(linkPDF, nomeEvento, solicitante, destinatarios) {
  const token = ScriptApp.getOAuthToken();
  destinatarios.forEach(email => {
    try {
      let msg = "To: " + email + "\r\nSubject: PDF Itens do Evento — " + nomeEvento + "\r\nContent-Type: text/plain; charset=UTF-8\r\n\n" +
        "O PDF foi gerado.\n\nEvento: " + nomeEvento + "\nSolicitante: " + (solicitante || "-") + "\n\n" + linkPDF + "\n\n— Sistema Liquidz";
      UrlFetchApp.fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST", headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
        payload: JSON.stringify({ raw: Utilities.base64EncodeWebSafe(msg) }), muteHttpExceptions: true
      });
    } catch (e) { console.error("Erro ao enviar email para " + email + ": " + e.message); }
  });
}
