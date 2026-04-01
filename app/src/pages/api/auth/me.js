import { jwtVerify } from 'jose'

export default async function handler(req, res) {
  const token = req.cookies.lqdz_sess
  if (!token) return res.status(401).json({ error: 'Não autenticado' })

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'liquidz-secret-fallback')
    const { payload } = await jwtVerify(token, secret)
    return res.status(200).json({ success: true, user: { email: payload.email, nome: payload.nome, role: payload.role } })
  } catch {
    return res.status(401).json({ error: 'Sessão inválida' })
  }
}
