import { mockEventos } from '../../lib/mockData'

export default async function handler(req, res) {
  const GAS_URL = process.env.GAS_WEB_APP_URL

  if (req.method === 'GET') {
    if (!GAS_URL) {
      let data = [...mockEventos]
      const { status } = req.query
      if (status) data = data.filter(e => e.status === status)
      return res.status(200).json({ success: true, data })
    }

    try {
      const qs = new URLSearchParams({ action: 'getEventos', ...req.query }).toString()
      const response = await fetch(`${GAS_URL}?${qs}`)
      const data = await response.json()
      return res.status(200).json(data)
    } catch (err) {
      console.error('GAS error:', err)
      return res.status(200).json({ success: true, data: mockEventos })
    }
  }

  if (req.method === 'POST') {
    if (!GAS_URL) {
      return res.status(200).json({ success: true, message: 'Evento criado (mock)' })
    }

    try {
      const response = await fetch(`${GAS_URL}?action=criarEvento`, {
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
