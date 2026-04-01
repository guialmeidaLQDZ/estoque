const BASE = '/api'

async function fetchJSON(url, options) {
  const res = await fetch(url, options)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function getEstoque() {
  return fetchJSON(`${BASE}/estoque`)
}

export async function getHistorico(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
  ).toString()
  return fetchJSON(`${BASE}/historico${qs ? '?' + qs : ''}`)
}

export async function getSolicitacoes(status) {
  const qs = status ? `?status=${status}` : ''
  return fetchJSON(`${BASE}/solicitacoes${qs}`)
}

export async function getSolicitacao(id) {
  return fetchJSON(`${BASE}/solicitacoes/${id}`)
}

export async function getEventos(status) {
  const qs = status ? `?status=${status}` : ''
  return fetchJSON(`${BASE}/eventos${qs}`)
}

export async function criarEvento(data) {
  return fetchJSON(`${BASE}/eventos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function getFinanceiro() {
  return fetchJSON(`${BASE}/financeiro`)
}

export async function criarSolicitacao(data) {
  return fetchJSON(`${BASE}/solicitacoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function aprovarSolicitacao(id, comentario) {
  return fetchJSON(`${BASE}/solicitacoes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'aprovar', comentario }),
  })
}

export async function rejeitarSolicitacao(id, comentario) {
  return fetchJSON(`${BASE}/solicitacoes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'rejeitar', comentario }),
  })
}
