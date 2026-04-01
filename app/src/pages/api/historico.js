import { mockHistorico } from '../../lib/mockData'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const GAS_URL = process.env.GAS_WEB_APP_URL

  if (!GAS_URL) {
    let data = [...mockHistorico]
    const { status, cd, tipo, from, to, q, page = 1, limit = 20 } = req.query

    if (status) data = data.filter(r => r.statusLogistica === status || r.statusFinanceiro === status)
    if (cd) data = data.filter(r => r.cd === cd)
    if (tipo) data = data.filter(r => r.tipo === tipo)
    if (from) data = data.filter(r => r.data >= from)
    if (to) data = data.filter(r => r.data <= to)
    if (q) {
      const lq = q.toLowerCase()
      data = data.filter(r =>
        r.sku.toLowerCase().includes(lq) ||
        r.nome.toLowerCase().includes(lq) ||
        r.evento?.toLowerCase().includes(lq)
      )
    }

    const total = data.length
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const start = (pageNum - 1) * limitNum
    const paginated = data.slice(start, start + limitNum)

    return res.status(200).json({ success: true, data: paginated, total, page: pageNum, limit: limitNum })
  }

  try {
    const qs = new URLSearchParams({ action: 'getHistorico', ...req.query }).toString()
    const response = await fetch(`${GAS_URL}?${qs}`)
    const data = await response.json()
    return res.status(200).json(data)
  } catch (err) {
    console.error('GAS error:', err)
    return res.status(200).json({ success: true, data: mockHistorico, total: mockHistorico.length })
  }
}
