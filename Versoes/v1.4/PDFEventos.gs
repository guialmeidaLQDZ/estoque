/**
 * ============================================================
 * LIQUIDZ — PDFEVENTOS.gs — Projeto v1.3
 * USA DRIVE API REST — sem DriveApp ou DocumentApp.
 * Estilos 100% inline. Categorias: Bonificado=cinza, Vendido=verde, Infra/Retorno=azul
 * ============================================================
 *
 * Changelog v1.3:
 * [FEAT-04] gerarHTML() redesenhada com brand guidelines Liquidz
 *           Header preto + barra verde, paleta off-white, total em verde
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

// ── Gera HTML — estilos 100% inline, brand guidelines Liquidz ────────────────
function gerarHTML(nomeEvento, solicitante, cdOrigem, tipoMovimento, dataPedido, itens, pedidos) {
  var dataFmt    = dataPedido
    ? Utilities.formatDate(new Date(dataPedido), Session.getScriptTimeZone(), "dd/MM/yyyy")
    : Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  var dataGer    = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  var idsPedidos = pedidos.map(function(p) { return p.idPedido; }).join(", ");

  // ── Brand palette ──
  var BLACK    = "#000000";
  var WHITE    = "#FFFFFF";
  var GREEN    = "#9BDB20";   // Verde Limão (primary accent)
  var OFFWHITE = "#F8F6F3";   // Primary background
  var LTGRAY   = "#E6E6E6";   // Light gray
  var MDGRAY   = "#808080";   // Dark gray

  // ── Category color map ──
  // Bonificado = cinza | Vendido = verde (brand) | Infra/Retorno = azul (funcional)
  var COR = {
    "Bonificado":    { rowBg: LTGRAY,    rowTxt: "#333333", hdrBg: MDGRAY,     hdrTxt: WHITE },
    "Vendido":       { rowBg: "#EBF8D2", rowTxt: BLACK,     hdrBg: GREEN,      hdrTxt: BLACK },
    "Infra/Retorno": { rowBg: "#D6EAF8", rowTxt: "#1a3a5c", hdrBg: "#1a6a9a",  hdrTxt: WHITE }
  };
  var CATS = ["Bonificado", "Vendido", "Infra/Retorno"];

  // ── Build item rows ──
  var blocos = "", totalGeral = 0;

  CATS.forEach(function(cat) {
    var itensCat = itens.filter(function(i) { return i.categoria === cat; });
    if (!itensCat.length) return;
    var c        = COR[cat];
    var subtotal = itensCat.reduce(function(a, i) { return a + i.qtd; }, 0);
    totalGeral  += subtotal;

    // Category header row
    blocos += '<tr>' +
      '<td colspan="3" style="padding:9px 12px;background-color:' + c.hdrBg + ';color:' + c.hdrTxt + ';font-weight:700;font-size:11px;letter-spacing:1.5px;border-top:2px solid ' + c.hdrBg + ';border-bottom:1px solid ' + c.hdrBg + '">' +
        cat.toUpperCase() +
      '</td>' +
    '</tr>';

    // Item rows
    itensCat.forEach(function(item) {
      blocos += '<tr>' +
        '<td style="padding:8px 12px;border-bottom:1px solid ' + LTGRAY + ';background-color:' + c.rowBg + ';color:' + c.rowTxt + ';font-size:12px">' + item.sku + '</td>' +
        '<td style="padding:8px 12px;border-bottom:1px solid ' + LTGRAY + ';background-color:' + c.rowBg + ';color:' + c.rowTxt + ';font-size:12px">' + item.nome + '</td>' +
        '<td style="padding:8px 12px;border-bottom:1px solid ' + LTGRAY + ';background-color:' + c.rowBg + ';color:' + c.rowTxt + ';font-size:12px;text-align:center;font-weight:600">' + item.qtd + '</td>' +
      '</tr>';
    });

    // Subtotal row
    blocos += '<tr>' +
      '<td colspan="2" style="padding:6px 12px;border-bottom:2px solid ' + LTGRAY + ';background-color:' + OFFWHITE + ';color:' + MDGRAY + ';font-size:11px;font-weight:600;font-style:italic">Subtotal ' + cat + '</td>' +
      '<td style="padding:6px 12px;border-bottom:2px solid ' + LTGRAY + ';background-color:' + OFFWHITE + ';color:' + MDGRAY + ';font-size:11px;font-weight:700;text-align:center">' + subtotal + '</td>' +
    '</tr>';
  });

  // "Outros" catch-all
  var semCat = itens.filter(function(i) { return !CATS.includes(i.categoria); });
  if (semCat.length) {
    var sub = semCat.reduce(function(a, i) { return a + i.qtd; }, 0);
    totalGeral += sub;
    blocos += '<tr><td colspan="3" style="padding:9px 12px;background-color:#555;color:' + WHITE + ';font-weight:700;font-size:11px;letter-spacing:1.5px">OUTROS</td></tr>';
    semCat.forEach(function(item) {
      blocos += '<tr>' +
        '<td style="padding:8px 12px;border-bottom:1px solid ' + LTGRAY + ';background-color:' + OFFWHITE + ';color:' + BLACK + ';font-size:12px">' + item.sku + '</td>' +
        '<td style="padding:8px 12px;border-bottom:1px solid ' + LTGRAY + ';background-color:' + OFFWHITE + ';color:' + BLACK + ';font-size:12px">' + item.nome + '</td>' +
        '<td style="padding:8px 12px;border-bottom:1px solid ' + LTGRAY + ';background-color:' + OFFWHITE + ';color:' + BLACK + ';font-size:12px;text-align:center;font-weight:600">' + item.qtd + '</td>' +
      '</tr>';
    });
    blocos += '<tr>' +
      '<td colspan="2" style="padding:6px 12px;border-bottom:2px solid ' + LTGRAY + ';background-color:' + OFFWHITE + ';color:' + MDGRAY + ';font-size:11px;font-weight:600;font-style:italic">Subtotal Outros</td>' +
      '<td style="padding:6px 12px;border-bottom:2px solid ' + LTGRAY + ';background-color:' + OFFWHITE + ';color:' + MDGRAY + ';font-size:11px;font-weight:700;text-align:center">' + sub + '</td>' +
    '</tr>';
  }

  // ── Info fields ──
  var campos = [
    ["Evento",            nomeEvento],
    ["Solicitante",       solicitante   || "Não informado"],
    ["CD de Origem",      cdOrigem      || "Não informado"],
    ["Tipo de Movimento", tipoMovimento || "Não informado"],
    ["Data do Pedido",    dataFmt],
    ["Pedidos incluídos", idsPedidos]
  ];

  var infoRows = campos.map(function(par) {
    return '<tr>' +
      '<td style="padding:5px 16px;font-size:10px;font-weight:700;color:' + MDGRAY + ';text-transform:uppercase;letter-spacing:0.8px;width:150px;white-space:nowrap;vertical-align:top">' + par[0] + '</td>' +
      '<td style="padding:5px 16px;font-size:13px;color:' + BLACK + ';font-weight:500">' + par[1] + '</td>' +
    '</tr>';
  }).join("");

  // ── Assemble HTML ──
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>' +
  '<body style="font-family:Arial,sans-serif;margin:0;padding:32px;background-color:' + OFFWHITE + ';color:' + BLACK + '">' +

    // ── Header ──
    '<table style="width:100%;border-collapse:collapse;background-color:' + BLACK + '">' +
      '<tr>' +
        '<td style="padding:20px 24px;vertical-align:middle">' +
          '<span style="font-size:24px;font-weight:900;color:' + WHITE + ';letter-spacing:3px;font-family:Arial Black,Arial,sans-serif">LIQUIDZ</span>' +
        '</td>' +
        '<td style="padding:20px 24px;text-align:right;vertical-align:middle">' +
          '<span style="font-size:10px;font-weight:700;color:' + GREEN + ';letter-spacing:2px;text-transform:uppercase">Lista de Itens do Evento</span>' +
        '</td>' +
      '</tr>' +
    '</table>' +
    // Green accent bar
    '<table style="width:100%;border-collapse:collapse"><tr><td style="height:5px;background-color:' + GREEN + ';font-size:1px">&nbsp;</td></tr></table>' +

    // ── Info block ──
    '<table style="width:100%;border-collapse:collapse;background-color:' + WHITE + ';border-left:4px solid ' + GREEN + ';margin-top:20px">' +
      '<tbody>' + infoRows + '</tbody>' +
    '</table>' +

    // ── Items table ──
    '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:20px">' +
      '<thead>' +
        '<tr>' +
          '<th style="padding:10px 12px;background-color:' + BLACK + ';color:' + WHITE + ';font-size:11px;font-weight:700;text-align:left;letter-spacing:1px;width:20%">SKU</th>' +
          '<th style="padding:10px 12px;background-color:' + BLACK + ';color:' + WHITE + ';font-size:11px;font-weight:700;text-align:left;letter-spacing:1px">NOME DO ITEM</th>' +
          '<th style="padding:10px 12px;background-color:' + BLACK + ';color:' + WHITE + ';font-size:11px;font-weight:700;text-align:center;letter-spacing:1px;width:80px">QTD</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' +
        blocos +
        // Total row
        '<tr>' +
          '<td colspan="2" style="padding:12px;background-color:' + BLACK + ';color:' + GREEN + ';font-weight:700;font-size:13px;letter-spacing:1px;border-top:3px solid ' + GREEN + '">TOTAL GERAL</td>' +
          '<td style="padding:12px;background-color:' + BLACK + ';color:' + GREEN + ';font-weight:700;font-size:14px;text-align:center;border-top:3px solid ' + GREEN + '">' + totalGeral + '</td>' +
        '</tr>' +
      '</tbody>' +
    '</table>' +

    // ── Footer ──
    '<table style="width:100%;border-collapse:collapse;margin-top:24px"><tr>' +
      '<td style="text-align:center;font-size:10px;color:#BAB9B6;padding:8px">Gerado automaticamente pelo sistema Liquidz &nbsp;&middot;&nbsp; ' + dataGer + '</td>' +
    '</tr></table>' +

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
