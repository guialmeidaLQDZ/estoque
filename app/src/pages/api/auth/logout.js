export default function handler(req, res) {
  res.setHeader('Set-Cookie', 'lqdz_sess=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax')
  return res.status(200).json({ success: true })
}
