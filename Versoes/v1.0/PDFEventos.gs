/**
 * MÓDULO: PDF - ITENS DO EVENTO (V2.1)
 * USA DRIVE API REST (UrlFetchApp) — sem DriveApp ou DocumentApp.
 * - Estilos 100% inline (sem CSS classes)
 * - Itens agrupados por categoria com cores: Bonificado=azul, Vendido=verde, Infra/Retorno=amarelo
 */

const ID_PASTA_PDFS = "1sto_HdDLsdqtk39d2dvfgmXBURUb1Yuy";
const EMAILS_DESTINATARIOS = [];

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================
function gerarPDFEventos() {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { console.log("Aguardando outra execução..."); return; }

  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const shPDF    = ss.getSheetByName("SOLICITACOES_PDF");
  const shHeader = ss.getSheetByName("SOLICITACOES_HEADER");
  const shItens  = ss.getSheetByName("SOLICITACOES_ITENS");

  if (!shPDF || !shHeader || !shItens) {
    console.error("❌ Aba não encontrada. Verifique: SOLICITACOES_PDF, SOLICITACOES_HEADER, SOLICITACOES_ITENS.");
    lock.releaseLock(); // early return explícito — try/finally não envolve este bloco
    return;
  }

  try {

  const dadosPDF    = shPDF.getDataRange().getValues();
  const dadosHeader = shHeader.getDataRange().getValues();
  const dadosItens  = shItens.getDataRange().getValues();

  // SOLICITACOES_HEADER: A=ID_Pedido, B=Data, C=Solicitante, D=Area, E=Evento, F=Tipo_Movimento, G=Status, H=local_de_retirada
  let pedidosPorEvento = {};
  for (let i = 1; i < dadosHeader.length; i++) {
    let row      = dadosHeader[i];
    let idPedido = row[0] ? row[0].toString().trim() : "";
    let evento   = row[4] ? row[4].toString().trim() : "";
    let status   = row[6] ? row[6].toString().trim().toUpperCase() : "";
    if (!idPedido || !evento || status !== "APROVADO") continue;
    if (!pedidosPorEvento[evento]) pedidosPorEvento[evento] = [];
    pedidosPorEvento[evento].push({
      idPedido:    idPedido,
      data:        row[1],
      solicitante: row[2] ? row[2].toString().trim() : "",
      area:        row[3] ? row[3].toString().trim() : "",
      tipo:        row[5] ? row[5].toString().trim() : "",
      cd:          row[7] ? row[7].toString().trim() : ""
    });
  }

  // SOLICITACOES_ITENS: A=ID_Linha, B=ID_Pedido, C=SKU, D=Nome_Item, E=Quantidade, F=local_de_retirada, G=Categoria_Uso
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
      categoria: row[6] ? row[6].toString().trim() : "Sem Categoria"
    });
  }

  // SOLICITACOES_PDF: A=ID, B=Nome_Evento, C=Solicitante, D=Status, E=Link_PDF, F=Data_Geração
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
      console.warn("⚠️ Nenhum pedido aprovado para: " + nomeEvento);
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

      // Agrupa por SKU+Categoria somando quantidades
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

      console.log("✅ PDF gerado para: " + nomeEvento + " → " + linkPDF);

    } catch (e) {
      console.error("❌ Erro ao gerar PDF para " + nomeEvento + ": " + e.message);
      shPDF.getRange(i + 1, 4).setValue("ERRO: " + e.message);
    }
  }

  SpreadsheetApp.flush(); // fix: único flush após o loop

  } finally {
    lock.releaseLock(); // fix: sempre liberado mesmo em erro
  }
}

// ============================================================
// GERA O HTML — ESTILOS 100% INLINE
// ============================================================
function gerarHTML(nomeEvento, solicitante, cdOrigem, tipoMovimento, dataPedido, itens, pedidos) {
  let dataFormatada = dataPedido
    ? Utilities.formatDate(new Date(dataPedido), Session.getScriptTimeZone(), "dd/MM/yyyy")
    : Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  let dataGeracao = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  let idsPedidos  = pedidos.map(p => p.idPedido).join(", ");

  // Cores por categoria (fundo claro para leitura, texto escuro)
  const COR_CATEGORIA = {
    "Bonificado":    { bg: "#e0e0e0", texto: "#333333" }, // cinza
    "Vendido":       { bg: "#d4edda", texto: "#155724" }, // verde
    "Infra/Retorno": { bg: "#cce5ff", texto: "#003366" }  // azul
  };
  const COR_HEADER_CATEGORIA = {
    "Bonificado":    { bg: "#757575", texto: "#ffffff" },
    "Vendido":       { bg: "#1e7e34", texto: "#ffffff" },
    "Infra/Retorno": { bg: "#0056b3", texto: "#ffffff" }
  };

  const categorias = ["Bonificado", "Vendido", "Infra/Retorno"];
  let blocosCategorias = "";
  let totalGeral = 0;

  categorias.forEach(cat => {
    let itensCat = itens.filter(i => i.categoria === cat);
    if (itensCat.length === 0) return;

    let corH = COR_HEADER_CATEGORIA[cat] || { bg: "#444444", texto: "#ffffff" };
    let corL = COR_CATEGORIA[cat]        || { bg: "#f5f5f5", texto: "#333333" };
    let subtotal = itensCat.reduce((acc, i) => acc + i.qtd, 0);
    totalGeral += subtotal;

    let linhas = itensCat.map(item =>
      '<tr>' +
        '<td style="padding:8px 10px;border:1px solid #cccccc;color:' + corL.texto + ';background-color:' + corL.bg + '">' + item.sku + '</td>' +
        '<td style="padding:8px 10px;border:1px solid #cccccc;color:' + corL.texto + ';background-color:' + corL.bg + '">' + item.nome + '</td>' +
        '<td style="padding:8px 10px;border:1px solid #cccccc;color:' + corL.texto + ';background-color:' + corL.bg + ';text-align:center">' + item.qtd + '</td>' +
      '</tr>'
    ).join("");

    blocosCategorias +=
      '<tr>' +
        '<td colspan="3" style="padding:10px;background-color:' + corH.bg + ';color:' + corH.texto + ';font-weight:bold;font-size:13px;border:1px solid #cccccc">' + cat.toUpperCase() + '</td>' +
      '</tr>' +
      linhas +
      '<tr>' +
        '<td colspan="2" style="padding:8px 10px;border:1px solid #cccccc;background-color:#eeeeee;font-weight:bold;color:#333333">Subtotal ' + cat + '</td>' +
        '<td style="padding:8px 10px;border:1px solid #cccccc;background-color:#eeeeee;font-weight:bold;color:#333333;text-align:center">' + subtotal + '</td>' +
      '</tr>';
  });

  // Itens sem categoria reconhecida
  let itensSemCat = itens.filter(i => !categorias.includes(i.categoria));
  if (itensSemCat.length > 0) {
    let subtotal = itensSemCat.reduce((acc, i) => acc + i.qtd, 0);
    totalGeral += subtotal;
    blocosCategorias +=
      '<tr><td colspan="3" style="padding:10px;background-color:#888888;color:#ffffff;font-weight:bold;font-size:13px;border:1px solid #cccccc">OUTROS</td></tr>' +
      itensSemCat.map(item =>
        '<tr>' +
          '<td style="padding:8px 10px;border:1px solid #cccccc;color:#333333;background-color:#f5f5f5">' + item.sku + '</td>' +
          '<td style="padding:8px 10px;border:1px solid #cccccc;color:#333333;background-color:#f5f5f5">' + item.nome + '</td>' +
          '<td style="padding:8px 10px;border:1px solid #cccccc;color:#333333;background-color:#f5f5f5;text-align:center">' + item.qtd + '</td>' +
        '</tr>'
      ).join("") +
      '<tr>' +
        '<td colspan="2" style="padding:8px 10px;border:1px solid #cccccc;background-color:#eeeeee;font-weight:bold;color:#333333">Subtotal Outros</td>' +
        '<td style="padding:8px 10px;border:1px solid #cccccc;background-color:#eeeeee;font-weight:bold;color:#333333;text-align:center">' + subtotal + '</td>' +
      '</tr>';
  }

  return '<!DOCTYPE html>' +
  '<html><head><meta charset="UTF-8"></head>' +
  '<body style="font-family:Arial,sans-serif;margin:40px;color:#1a1a2e;background-color:#ffffff">' +

    '<h1 style="text-align:center;font-size:22px;color:#1a1a2e;border-bottom:3px solid #1a1a2e;padding-bottom:8px;margin-bottom:20px">LIQUIDZ — PDF ITENS DO EVENTO</h1>' +

    '<div style="background-color:#f9f9f9;border-left:4px solid #1a1a2e;padding:12px 16px;margin:16px 0;border-radius:4px">' +
      '<p style="margin:4px 0;font-size:13px;color:#1a1a2e"><strong style="color:#1a1a2e">Evento:</strong> ' + nomeEvento + '</p>' +
      '<p style="margin:4px 0;font-size:13px;color:#1a1a2e"><strong style="color:#1a1a2e">Solicitante:</strong> ' + (solicitante || "Não informado") + '</p>' +
      '<p style="margin:4px 0;font-size:13px;color:#1a1a2e"><strong style="color:#1a1a2e">CD de Origem:</strong> ' + (cdOrigem || "Não informado") + '</p>' +
      '<p style="margin:4px 0;font-size:13px;color:#1a1a2e"><strong style="color:#1a1a2e">Tipo de Movimento:</strong> ' + (tipoMovimento || "Não informado") + '</p>' +
      '<p style="margin:4px 0;font-size:13px;color:#1a1a2e"><strong style="color:#1a1a2e">Data do Pedido:</strong> ' + dataFormatada + '</p>' +
      '<p style="margin:4px 0;font-size:13px;color:#1a1a2e"><strong style="color:#1a1a2e">Pedidos incluídos:</strong> ' + idsPedidos + '</p>' +
    '</div>' +

    '<h2 style="font-size:15px;color:#1a1a2e;margin-top:24px">ITENS SOLICITADOS</h2>' +

    '<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px">' +
      '<thead>' +
        '<tr>' +
          '<th style="padding:10px 8px;border:1px solid #cccccc;background-color:#1a1a2e;color:#ffffff;text-align:left">SKU</th>' +
          '<th style="padding:10px 8px;border:1px solid #cccccc;background-color:#1a1a2e;color:#ffffff;text-align:left">Nome do Item</th>' +
          '<th style="padding:10px 8px;border:1px solid #cccccc;background-color:#1a1a2e;color:#ffffff;text-align:center">Quantidade</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' +
        blocosCategorias +
        '<tr>' +
          '<td colspan="2" style="padding:10px;border:1px solid #cccccc;background-color:#1a1a2e;color:#ffffff;font-weight:bold;font-size:14px">TOTAL GERAL</td>' +
          '<td style="padding:10px;border:1px solid #cccccc;background-color:#1a1a2e;color:#ffffff;font-weight:bold;font-size:14px;text-align:center">' + totalGeral + '</td>' +
        '</tr>' +
      '</tbody>' +
    '</table>' +

    '<p style="text-align:center;font-size:10px;color:#999999;margin-top:32px;font-style:italic">Documento gerado automaticamente pelo sistema Liquidz em ' + dataGeracao + '</p>' +

  '</body></html>';
}

// ============================================================
// FAZ UPLOAD DO HTML COMO GOOGLE DOC E EXPORTA COMO PDF
// ============================================================
function uploadEExportarPDF(html, nomeEvento) {
  const token    = ScriptApp.getOAuthToken();
  const boundary = "liquidz_boundary_" + new Date().getTime();
  const nomeArq  = "PDF_Evento_" + nomeEvento.replace(/[^a-zA-Z0-9À-ú ]/g, "_") + "_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmm");

  // 1. Upload HTML → Google Doc
  const metaDados  = { name: "TEMP_" + nomeArq, mimeType: "application/vnd.google-apps.document" };
  const partesMeta = "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + JSON.stringify(metaDados) + "\r\n";
  const partesHTML = "--" + boundary + "\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n" + html + "\r\n--" + boundary + "--";

  let resUpload = UrlFetchApp.fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: { "Authorization": "Bearer " + token, "Content-Type": "multipart/related; boundary=" + boundary },
    payload: partesMeta + partesHTML,
    muteHttpExceptions: true
  });

  let docTemp = JSON.parse(resUpload.getContentText());
  if (!docTemp.id) throw new Error("Falha no upload: " + resUpload.getContentText());
  let docId = docTemp.id;

  // 2. Exporta como PDF
  let resPDF = UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + docId + "/export?mimeType=application/pdf", {
    method: "GET",
    headers: { "Authorization": "Bearer " + token },
    muteHttpExceptions: true
  });
  if (resPDF.getResponseCode() !== 200) throw new Error("Falha ao exportar PDF: " + resPDF.getContentText());

  // 3. Salva o PDF na pasta
  const metaPDF    = { name: nomeArq + ".pdf", parents: [ID_PASTA_PDFS] };
  const partesPDF  = "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + JSON.stringify(metaPDF) + "\r\n--" + boundary + "\r\nContent-Type: application/pdf\r\n\r\n";
  const bodyBytes  = Utilities.newBlob(partesPDF).getBytes()
    .concat(resPDF.getBlob().getBytes())
    .concat(Utilities.newBlob("\r\n--" + boundary + "--").getBytes());

  let resSalvar = UrlFetchApp.fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true", {
    method: "POST",
    headers: { "Authorization": "Bearer " + token, "Content-Type": "multipart/related; boundary=" + boundary },
    payload: bodyBytes,
    muteHttpExceptions: true
  });

  let pdfSalvo = JSON.parse(resSalvar.getContentText());
  if (!pdfSalvo.id) throw new Error("Falha ao salvar PDF na pasta: " + resSalvar.getContentText());

  // 4. Torna acessível via link
  UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + pdfSalvo.id + "/permissions?supportsAllDrives=true", {
    method: "POST",
    headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
    payload: JSON.stringify({ role: "reader", type: "anyone" }),
    muteHttpExceptions: true
  });

  // 5. Deleta Doc temporário
  UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + docId, {
    method: "DELETE",
    headers: { "Authorization": "Bearer " + token },
    muteHttpExceptions: true
  });

  return "https://drive.google.com/file/d/" + pdfSalvo.id + "/view";
}

// ============================================================
// ENVIA EMAIL COM LINK DO PDF
// ============================================================
function enviarEmail(linkPDF, nomeEvento, solicitante, destinatarios) {
  const token = ScriptApp.getOAuthToken();
  let assunto = "PDF Itens do Evento — " + nomeEvento;
  let corpo   =
    "Olá,\n\nO PDF de itens do evento foi gerado com sucesso.\n\n" +
    "Evento: " + nomeEvento + "\n" +
    "Solicitante: " + (solicitante || "Não informado") + "\n\n" +
    "Acesse o PDF:\n" + linkPDF + "\n\n— Sistema Liquidz";

  destinatarios.forEach(email => {
    try {
      let mensagem =
        "To: " + email + "\r\n" +
        "Subject: " + assunto + "\r\n" +
        "Content-Type: text/plain; charset=UTF-8\r\n\r\n" + corpo;
      UrlFetchApp.fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
        payload: JSON.stringify({ raw: Utilities.base64EncodeWebSafe(mensagem) }),
        muteHttpExceptions: true
      });
    } catch (e) {
      console.error("Erro ao enviar email para " + email + ": " + e.message);
    }
  });
}