import { mockSolicitacoes } from '../../lib/mockData'

// In-memory store for demo (when no GAS)
let solicitacoesStore = [...mockSolicitacoes]

export default async function handler(req, res) {
  const GAS_URL = process.env.GAS_WEB_APP_URL

  if (req.method === 'GET') {
    if (!GAS_URL) {
      let data = [...solicitacoesStore]
      const { status } = req.query
      if (status) data = data.filter(s => s.status === status)
      return res.status(200).json({ success: true, data })
    }

    try {
      const qs = new URLSearchParams({ action: 'getSolicitacoes', ...req.query }).toString()
      const response = await fetch(`${GAS_URL}?${qs}`)
      const data = await response.json()
      return res.status(200).json(data)
    } catch (err) {
      console.error('GAS error:', err)
      return res.status(200).json({ success: true, data: mockSolicitacoes })
    }
  }

  if (req.method === 'POST') {
    if (!GAS_URL) {
      const body = req.body
      const now = new Date()
      const pad = n => String(n).padStart(2, '0')
      const id = `SOL-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
      const nova = {
        id,
        timestamp: now.toISOString(),
        solicitante: body.solicitante || 'Guilherme',
        email: body.email || 'guilherme.almeida@liquidz.com.br',
        cd: body.cd,
        evento: body.evento || '',
        status: 'PENDENTE',
        justificativa: body.justificativa || '',
        aprovador: '',
        dataAprovacao: '',
        comentarioAprovacao: '',
        itens: body.itens || [],
      }
      solicitacoesStore.unshift(nova)
      return res.status(200).json({ success: true, data: nova })
    }

    try {
      const response = await fetch(`${GAS_URL}?action=criarSolicitacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      })
      const data = await response.json()
      return res.status(200).json(data)
    } catch (err) {
      console.error('GAS error:', err)
      return res.status(500).json({ success: false, error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
