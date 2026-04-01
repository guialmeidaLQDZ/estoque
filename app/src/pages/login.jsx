import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Acesso negado')
        return
      }

      router.replace('/')
    } catch (err) {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Login — LIQUIDZ Estoque</title>
      </Head>

      <div style={{
        minHeight: '100vh',
        background: '#F8F6F3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'Manrope, sans-serif',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#000',
              padding: '14px 28px',
              borderRadius: 12,
            }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 22, letterSpacing: 3 }}>LIQUIDZ</span>
              <span style={{ width: 8, height: 8, background: '#9BDB20', borderRadius: '50%', display: 'inline-block' }} />
            </div>
            <p style={{ color: '#888', fontSize: 13, marginTop: 12 }}>Gestão de Estoque</p>
          </div>

          {/* Card */}
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 36,
            boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
            border: '1px solid #E6E6E6',
          }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Entrar</h1>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 28 }}>Acesso restrito a usuários autorizados</p>

            {error && (
              <div style={{
                background: '#FFF0F0',
                border: '1px solid #FFCCCC',
                borderRadius: 8,
                padding: '10px 14px',
                color: '#CC0000',
                fontSize: 13,
                marginBottom: 20,
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="seu@liquidz.com.br"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1.5px solid #D0CCC8',
                    borderRadius: 8,
                    fontFamily: 'Manrope',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                  Senha
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1.5px solid #D0CCC8',
                    borderRadius: 8,
                    fontFamily: 'Manrope',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 8,
                  padding: '12px',
                  background: loading ? '#ccc' : '#9BDB20',
                  color: '#000',
                  border: 'none',
                  borderRadius: 8,
                  fontFamily: 'Manrope',
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  letterSpacing: 0.5,
                }}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
