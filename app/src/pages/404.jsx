export default function NotFound() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', background: '#F8F6F3',
      fontFamily: 'Manrope, sans-serif'
    }}>
      <div style={{ fontSize: 64, fontWeight: 800, color: '#9BDB20' }}>404</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>Página não encontrada</div>
      <a href="/" style={{
        marginTop: 24, padding: '10px 28px', background: '#9BDB20',
        color: '#000', borderRadius: 999, fontWeight: 700,
        textDecoration: 'none', fontSize: 14
      }}>Voltar ao início</a>
    </div>
  );
}
