import { mockEstoque } from '../../lib/mockData'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const GAS_URL = process.env.GAS_WEB_APP_URL

  if (!GAS_URL) {
    return res.status(200).json({ success: true, data: mockEstoque })
  }

  try {
    const response = await fetch(`${GAS_URL}?action=getEstoque`)
    const data = await response.json()
    return res.status(200).json(data)
  } catch (err) {
    console.error('GAS error, falling back to mock:', err)
    return res.status(200).json({ success: true, data: mockEstoque })
  }
}
