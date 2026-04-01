export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query
  const GAS_URL = process.env.GAS_WEB_APP_URL

  if (!GAS_URL) {
    return res.status(200).json({ success: true, message: `PDF para ${id} gerado (demo). Configure GAS_WEB_APP_URL para gerar PDF real.` })
  }

  try {
    const response = await fetch(`${GAS_URL}?action=gerarPDF&id=${id}`)
    const data = await response.json()
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
