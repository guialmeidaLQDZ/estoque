// ═══════════════════════════════════════════════════════════════
//  LIQUIDZ — Gestão de Estoque Web App
//  Script ID: 1_Y5TgUAOWM7SuiBpD6Xhba52ko3-ITCmzS860jwFIfV54QmnCCKW_VYf
//  Master Sheet ID: 1yCK8TlPShu9QwNd5O9pg3izDAHwgxpov1zMgDGC17n4
// ═══════════════════════════════════════════════════════════════

const MASTER_SHEET_ID = '1yCK8TlPShu9QwNd5O9pg3izDAHwgxpov1zMgDGC17n4'

// Sheet names
const SHEET_HISTORICO     = 'HISTORICO_MOVIMENTACAO'
const SHEET_PRODUTOS      = 'BASE_PRODUTOS'
const SHEET_SOL_HEADER    = 'SOLICITACOES_HEADER'
const SHEET_SOL_ITENS     = 'SOLICITACOES_ITENS'
const SHEET_EVENTOS       = 'EVENTOS_ATIVOS'
const SHEET_FINANCEIRO    = 'RESUMO_FINANCEIRO'

// ── Helpers ────────────────────────────────────────────────────

function getMasterSS() {
  return SpreadsheetApp.openById(MASTER_SHEET_ID)
}

function ok(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON)
}

function err(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON)
}

function sheetToObjects(sheet, headerRow) {
  const rows = sheet.getDataRange().getValues()
  if (rows.length <= headerRow) return []
  const headers = rows[headerRow - 1]
  return rows.slice(headerRow).map(row => {
    const obj = {}
    headers.forEach((h, i) => {
      obj[h] = row[i]
    })
    return obj
  })
}

function dateStr(d) {
  return Utilities.formatDate(d instanceof Date ? d : new Date(d), 'America/Sao_Paulo', 'yyyy-MM-dd')
}

function tsStr(d) {
  return Utilities.formatDate(d instanceof Date ? d : new Date(d), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss")
}

// ── doGet ──────────────────────────────────────────────────────

function doGet(e) {
  const action = e.parameter.action || ''

  try {
    switch (action) {
      case 'getEstoque':        return getEstoque(e)
      case 'getHistorico':      return getHistorico(e)
      case 'getSolicitacoes':   return getSolicitacoes(e)
      case 'getSolicitacao':    return getSolicitacao(e)
      case 'getEventos':        return getEventos(e)
      case 'getFinanceiro':     return getFinanceiro(e)
      default:                  return ok({ message: 'LIQUIDZ Estoque API v1.6 — ok' })
    }
  } catch (ex) {
    return err(ex.message)
  }
}

// ── doPost ─────────────────────────────────────────────────────

function doPost(e) {
  let body = {}
  try {
    body = JSON.parse(e.postData.contents)
  } catch (_) {}

  const action = (e.parameter.action || body.action || '')

  try {
    switch (action) {
      case 'criarSolicitacao':    return criarSolicitacao(body)
      case 'aprovarSolicitacao':  return aprovarSolicitacao(body)
      case 'rejeitarSolicitacao': return rejeitarSolicitacao(body)
      case 'criarEvento':         return criarEvento(body)
      default:                    return err('Ação desconhecida: ' + action)
    }
  } catch (ex) {
    return err(ex.message)
  }
}

// ══════════════════════════════════════════════════════════════
//  GET HANDLERS
// ══════════════════════════════════════════════════════════════

// ── getEstoque ─────────────────────────────────────────────────
// BASE_PRODUTOS: A=SKU, B=Nome, C=Esc, D=Rio, E=GE, F=GV, G=RV, H=Total, I=UltimaAtualizacao

function getEstoque(e) {
  const ss = getMasterSS()
  const sheet = ss.getSheetByName(SHEET_PRODUTOS)
  const rows = sheet.getDataRange().getValues()

  const data = rows.slice(1).map(r => ({
    sku:              r[0],
    nome:             r[1],
    escritorio:       Number(r[2]) || 0,
    rio:              Number(r[3]) || 0,
    galpaoEventos:    Number(r[4]) || 0,
    galpaoVarejo:     Number(r[5]) || 0,
    rioVarejo:        Number(r[6]) || 0,
    total:            Number(r[7]) || 0,
    ultimaAtualizacao: r[8] ? tsStr(r[8]) : '',
  })).filter(r => r.sku)

  return ok(data)
}

// ── getHistorico ───────────────────────────────────────────────
// HISTORICO: A=Timestamp, B=Data, C=SKU, D=Nome, E=Qtd, F=Tipo, G=CD, J=Evento, K=StatusLog, L=StatusFin, M=LogErro

function getHistorico(e) {
  const p = e.parameter
  const status = p.status || ''
  const cd     = p.cd     || ''
  const tipo   = p.tipo   || ''
  const from   = p.from   || ''
  const to     = p.to     || ''
  const q      = (p.q     || '').toLowerCase()
  const page   = parseInt(p.page  || '1')
  const limit  = parseInt(p.limit || '20')

  const ss = getMasterSS()
  const sheet = ss.getSheetByName(SHEET_HISTORICO)
  const rows = sheet.getDataRange().getValues()

  let data = rows.slice(1).map(r => ({
    timestamp:        r[0] ? tsStr(r[0]) : '',
    data:             r[1] ? dateStr(r[1]) : '',
    sku:              r[2],
    nome:             r[3],
    quantidade:       Number(r[4]) || 0,
    tipo:             r[5],
    cd:               r[6],
    evento:           r[9],
    statusLogistica:  r[10],
    statusFinanceiro: r[11] || '',
    logErro:          r[12] || '',
  })).filter(r => r.sku)

  // Apply filters
  if (status) data = data.filter(r => r.statusLogistica === status || r.statusFinanceiro === status)
  if (cd)     data = data.filter(r => r.cd === cd)
  if (tipo)   data = data.filter(r => r.tipo === tipo)
  if (from)   data = data.filter(r => r.data >= from)
  if (to)     data = data.filter(r => r.data <= to)
  if (q)      data = data.filter(r =>
    (r.sku  || '').toLowerCase().includes(q) ||
    (r.nome || '').toLowerCase().includes(q) ||
    (r.evento || '').toLowerCase().includes(q)
  )

  // Sort by timestamp desc
  data.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  const total = data.length
  const start = (page - 1) * limit
  const paginated = data.slice(start, start + limit)

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, data: paginated, total, page, limit }))
    .setMimeType(ContentService.MimeType.JSON)
}

// ── getSolicitacoes ────────────────────────────────────────────
// SOLICITACOES_HEADER: A=ID, B=Timestamp, C=Solicitante, D=Email, E=CD, F=Evento,
//                      G=Status, H=Justificativa, I=Aprovador, J=DataAprovacao, K=Comentario

function getSolicitacoes(e) {
  const status = e.parameter.status || ''

  const ss = getMasterSS()
  const headerSheet = ss.getSheetByName(SHEET_SOL_HEADER)
  const itensSheet  = ss.getSheetByName(SHEET_SOL_ITENS)

  const headerRows = headerSheet.getDataRange().getValues()
  const itensRows  = itensSheet.getDataRange().getValues()

  // Build itens map by ID
  const itensMap = {}
  itensRows.slice(1).forEach(r => {
    const id = r[0]
    if (!itensMap[id]) itensMap[id] = []
    itensMap[id].push({
      sku:             r[1],
      nome:            r[2],
      quantidade:      Number(r[3]) || 0,
      tipo:            r[4],
      impactoEstoque:  r[5],
    })
  })

  let data = headerRows.slice(1).map(r => ({
    id:                  r[0],
    timestamp:           r[1] ? tsStr(r[1]) : '',
    solicitante:         r[2],
    email:               r[3],
    cd:                  r[4],
    evento:              r[5],
    status:              r[6],
    justificativa:       r[7],
    aprovador:           r[8] || '',
    dataAprovacao:       r[9] ? tsStr(r[9]) : '',
    comentarioAprovacao: r[10] || '',
    itens:               itensMap[r[0]] || [],
  })).filter(r => r.id)

  if (status) data = data.filter(r => r.status === status)

  // Sort by timestamp desc
  data.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  return ok(data)
}

// ── getSolicitacao ─────────────────────────────────────────────

function getSolicitacao(e) {
  const id = e.parameter.id || ''
  if (!id) return err('ID obrigatório')

  const ss = getMasterSS()
  const headerSheet = ss.getSheetByName(SHEET_SOL_HEADER)
  const itensSheet  = ss.getSheetByName(SHEET_SOL_ITENS)

  const headerRows = headerSheet.getDataRange().getValues()
  const itensRows  = itensSheet.getDataRange().getValues()

  const headerRow = headerRows.slice(1).find(r => r[0] === id)
  if (!headerRow) return err('Solicitação não encontrada: ' + id)

  const itens = itensRows.slice(1)
    .filter(r => r[0] === id)
    .map(r => ({
      sku:            r[1],
      nome:           r[2],
      quantidade:     Number(r[3]) || 0,
      tipo:           r[4],
      impactoEstoque: r[5],
    }))

  return ok({
    id:                  headerRow[0],
    timestamp:           headerRow[1] ? tsStr(headerRow[1]) : '',
    solicitante:         headerRow[2],
    email:               headerRow[3],
    cd:                  headerRow[4],
    evento:              headerRow[5],
    status:              headerRow[6],
    justificativa:       headerRow[7],
    aprovador:           headerRow[8] || '',
    dataAprovacao:       headerRow[9] ? tsStr(headerRow[9]) : '',
    comentarioAprovacao: headerRow[10] || '',
    itens,
  })
}

// ── getEventos ─────────────────────────────────────────────────
// EVENTOS_ATIVOS: A=Nome, B=DataInicio, C=DataFim, D=Status, E=CD, F=Responsavel, G=Observacoes

function getEventos(e) {
  const status = (e && e.parameter && e.parameter.status) || ''

  const ss = getMasterSS()
  const sheet = ss.getSheetByName(SHEET_EVENTOS)
  const rows = sheet.getDataRange().getValues()

  let data = rows.slice(1).map(r => ({
    nome:        r[0],
    dataInicio:  r[1] ? dateStr(r[1]) : '',
    dataFim:     r[2] ? dateStr(r[2]) : '',
    status:      r[3],
    cd:          r[4],
    responsavel: r[5],
    observacoes: r[6] || '',
  })).filter(r => r.nome)

  if (status) data = data.filter(ev => ev.status === status)

  return ok(data)
}

// ── getFinanceiro ──────────────────────────────────────────────
// RESUMO_FINANCEIRO (real structure from Financeiro.gs):
//   A=Timestamp, B=Evento, C=CustoTotal, D=PrecisaNF(SIM/NAO), E=UrlClickUp

function getFinanceiro(e) {
  const ss = getMasterSS()
  const sheet = ss.getSheetByName(SHEET_FINANCEIRO)
  const rows = sheet.getDataRange().getValues()

  const TRADE_EVENTO = 'Trade Clientes'

  const data = rows.slice(1).map(r => {
    const evento     = String(r[1] || '')
    const urlClickup = String(r[4] || '')
    const statusNF   = urlClickup.startsWith('http') ? 'PROCESSADO' : 'PENDENTE'
    // Responsável: Larissa para Trade Clientes, Fernanda para demais (FEAT-08)
    const responsavel = evento === TRADE_EVENTO ? 'Larissa Morais' : 'Fernanda Falchetto'
    return {
      evento,
      valorTotal:  Number(r[2]) || 0,
      precisaNF:   String(r[3] || ''),
      urlClickup,
      statusNF,
      responsavel,
    }
  }).filter(r => r.evento)

  return ok(data)
}

// ══════════════════════════════════════════════════════════════
//  POST HANDLERS
// ══════════════════════════════════════════════════════════════

// ── criarSolicitacao ───────────────────────────────────────────

function criarSolicitacao(body) {
  const now = new Date()
  const id = 'SOL-' + Utilities.formatDate(now, 'America/Sao_Paulo', 'yyyyMMdd-HHmmss')

  const ss = getMasterSS()
  const headerSheet = ss.getSheetByName(SHEET_SOL_HEADER)
  const itensSheet  = ss.getSheetByName(SHEET_SOL_ITENS)

  // Write header row
  headerSheet.appendRow([
    id,
    now,
    body.solicitante || '',
    body.email       || '',
    body.cd          || '',
    body.evento      || '',
    'PENDENTE',
    body.justificativa || '',
    '',   // Aprovador
    '',   // DataAprovacao
    '',   // ComentarioAprovacao
  ])

  // Write item rows
  const itens = body.itens || []
  itens.forEach(item => {
    itensSheet.appendRow([
      id,
      item.sku        || '',
      item.nome       || '',
      item.quantidade || 0,
      item.tipo       || 'Entrada',
      item.impactoEstoque || '',
    ])
  })

  return ok({ id, status: 'PENDENTE', timestamp: tsStr(now) })
}

// ── aprovarSolicitacao ─────────────────────────────────────────

function aprovarSolicitacao(body) {
  const id         = body.id         || ''
  const comentario = body.comentario || ''
  const aprovador  = body.aprovador  || 'Sistema'

  if (!id) return err('ID obrigatório')

  const ss = getMasterSS()
  const headerSheet    = ss.getSheetByName(SHEET_SOL_HEADER)
  const itensSheet     = ss.getSheetByName(SHEET_SOL_ITENS)
  const historicoSheet = ss.getSheetByName(SHEET_HISTORICO)

  const headerData = headerSheet.getDataRange().getValues()
  const rowIdx = headerData.findIndex(r => r[0] === id)
  if (rowIdx < 0) return err('Solicitação não encontrada: ' + id)

  const now = new Date()

  // Update header: G=APROVADO, I=Aprovador, J=DataAprovacao, K=Comentario
  const sheetRow = rowIdx + 1  // 1-indexed
  headerSheet.getRange(sheetRow, 7).setValue('APROVADO')
  headerSheet.getRange(sheetRow, 9).setValue(aprovador)
  headerSheet.getRange(sheetRow, 10).setValue(now)
  headerSheet.getRange(sheetRow, 11).setValue(comentario)

  // Get header fields for historico
  const headerRow = headerData[rowIdx]
  const cdDestino = headerRow[4]
  const evento    = headerRow[5]

  // Write each item to HISTORICO_MOVIMENTACAO with STATUS=PENDENTE
  const itensData = itensSheet.getDataRange().getValues()
  const itens = itensData.slice(1).filter(r => r[0] === id)

  itens.forEach(item => {
    historicoSheet.appendRow([
      now,           // A Timestamp
      dateStr(now),  // B Data
      item[1],       // C SKU
      item[2],       // D Nome
      item[3],       // E Quantidade
      item[4],       // F Tipo (Entrada/Saída)
      cdDestino,     // G CD
      '',            // H blank
      '',            // I blank
      evento,        // J Evento
      'PENDENTE',    // K Status Logística
      '',            // L Status Financeiro
      '',            // M Log Erro
    ])
  })

  return ok({ id, status: 'APROVADO', aprovadoEm: tsStr(now) })
}

// ── rejeitarSolicitacao ────────────────────────────────────────

function rejeitarSolicitacao(body) {
  const id         = body.id         || ''
  const comentario = body.comentario || ''
  const aprovador  = body.aprovador  || 'Sistema'

  if (!id) return err('ID obrigatório')

  const ss = getMasterSS()
  const headerSheet = ss.getSheetByName(SHEET_SOL_HEADER)
  const headerData  = headerSheet.getDataRange().getValues()
  const rowIdx = headerData.findIndex(r => r[0] === id)
  if (rowIdx < 0) return err('Solicitação não encontrada: ' + id)

  const now = new Date()
  const sheetRow = rowIdx + 1

  headerSheet.getRange(sheetRow, 7).setValue('REJEITADO')
  headerSheet.getRange(sheetRow, 9).setValue(aprovador)
  headerSheet.getRange(sheetRow, 10).setValue(now)
  headerSheet.getRange(sheetRow, 11).setValue(comentario)

  return ok({ id, status: 'REJEITADO', rejeitadoEm: tsStr(now) })
}

// ── criarEvento ───────────────────────────────────────────────
// EVENTOS_ATIVOS: A=Nome, B=DataInicio, C=DataFim, D=Status, E=CD, F=Responsavel, G=Observacoes

function criarEvento(body) {
  if (!body.nome) return err('Nome do evento obrigatório')
  if (!body.dataInicio) return err('Data de início obrigatória')
  if (!body.dataFim) return err('Data de fim obrigatória')

  const ss = getMasterSS()
  const sheet = ss.getSheetByName(SHEET_EVENTOS)

  sheet.appendRow([
    body.nome,
    new Date(body.dataInicio),
    new Date(body.dataFim),
    'FUTURO',
    body.cd || '',
    body.responsavel || '',
    body.observacoes || '',
  ])

  return ok({ message: 'Evento criado com sucesso', nome: body.nome })
}

// ══════════════════════════════════════════════════════════════
//  UTILITY — Generate unique ID for PDF
// ══════════════════════════════════════════════════════════════

function gerarPDF(e) {
  const id = (e && e.parameter && e.parameter.id) || ''
  // PDF generation logic integrates with existing GAS PDF functions
  // This is a placeholder — connect to your existing gerarRelatorio / gerarNF functions
  return ok({ message: 'PDF para ' + id + ' enfileirado para geração.', id })
}
