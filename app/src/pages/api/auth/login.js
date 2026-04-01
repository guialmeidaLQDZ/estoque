import { SignJWT } from 'jose'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, senha } = req.body || {}
  if (!email) return res.status(400).json({ error: 'Email obrigatório' })

  const GAS_URL = process.env.GAS_WEB_APP_URL

  let user

  if (!GAS_URL) {
    // Dev fallback: qualquer email funciona, admin se terminar em @liquidz.com.br
    user = {
      email: email.toLowerCase(),
      nome: email.split('@')[0],
      role: email.includes('liquidz') ? 'admin' : 'user',
    }
  } else {
    try {
      const response = await fetch(`${GAS_URL}?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, senha: senha || '' }),
      })
      const data = await response.json()
      if (!data.success) return res.status(401).json({ error: data.error || 'Acesso negado' })
      user = data.data
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao conectar ao servidor: ' + err.message })
    }
  }

  const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'liquidz-secret-fallback')
  const token = await new SignJWT({ email: user.email, nome: user.nome, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(secret)

  res.setHeader(
    'Set-Cookie',
    `lqdz_sess=${token}; HttpOnly; Path=/; Max-Age=${8 * 3600}; SameSite=Lax`
  )
  return res.status(200).json({ success: true, user })
}
