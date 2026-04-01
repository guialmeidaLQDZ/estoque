import { mockSolicitacoes } from '../../../lib/mockData'

// Shared in-memory store (Note: in Next.js dev, each module is fresh per request in some configs)
// For demo purposes this works fine
let store = null

function getStore() {
  if (!store) store = [...mockSolicitacoes]
  return store
}

export default async function handler(req, res) {
  const { id } = req.query
  const GAS_URL = process.env.GAS_WEB_APP_URL

  if (req.method === 'GET') {
    if (!GAS_URL) {
      const sol = getStore().find(s => s.id === id)
      if (!sol) return res.status(404).json({ success: false, error: 'Not found' })
      return res.status(200).json({ success: true, data: sol })
    }

    try {
      const response = await fetch(`${GAS_URL}?action=getSolicitacao&id=${id}`)
      const data = await response.json()
      return res.status(200).json(data)
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message })
    }
  }

  if (req.method === 'PUT') {
    const { action, comentario } = req.body

    if (!GAS_URL) {
      const storeArr = getStore()
      const idx = storeArr.findIndex(s => s.id === id)
      if (idx === -1) return res.status(404).json({ success: false, error: 'Not found' })

      if (action === 'aprovar') {
        storeArr[idx] = {
          ...storeArr[idx],
          status: 'APROVADO',
          aprovador: 'Guilherme Almeida',
          dataAprovacao: new Date().toISOString(),
          comentarioAprovacao: comentario || '',
        }
      } else if (action === 'rejeitar') {
        storeArr[idx] = {
          ...storeArr[idx],
          status: 'REJEITADO',
          aprovador: 'Guilherme Almeida',
          dataAprovacao: new Date().toISOString(),
          comentarioAprovacao: comentario || '',
        }
      }

      return res.status(200).json({ success: true, data: storeArr[idx] })
    }

    try {
      const gasAction = action === 'aprovar' ? 'aprovarSolicitacao' : 'rejeitarSolicitacao'
      const response = await fetch(`${GAS_URL}?action=${gasAction}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, comentario }),
      })
      const data = await response.json()
      return res.status(200).json(data)
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
