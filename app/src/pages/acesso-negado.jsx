import Head from 'next/head'
import { signOut } from 'next-auth/react'

export default function AcessoNegado() {
  return (
    <>
      <Head><title>Acesso Negado — LIQUIDZ</title></Head>
      <div style={{
        minHeight: '100vh',
        background: '#F8F6F3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Manrope, sans-serif',
        padding: 24,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: '#000',
            padding: '12px 24px',
            borderRadius: 10,
            marginBottom: 32,
          }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 18, letterSpacing: 3 }}>LIQUIDZ</span>
            <span style={{ width: 7, height: 7, background: '#9BDB20', borderRadius: '50%' }} />
          </div>

          <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Acesso Negado</h1>
          <p style={{ color: '#666', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
            Seu email não está autorizado a acessar este sistema.<br />
            Apenas usuários <strong>@liquidz.com.br</strong> têm acesso.
          </p>

          <button
            onClick={() => signOut({ callbackUrl: '/api/auth/signin' })}
            style={{
              background: '#9BDB20',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontFamily: 'Manrope',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Tentar com outra conta
          </button>
        </div>
      </div>
    </>
  )
}
