export default function ServerError() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', background: '#F8F6F3',
      fontFamily: 'Manrope, sans-serif'
    }}>
      <div style={{ fontSize: 64, fontWeight: 800, color: '#FA3A3D' }}>500</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>Erro interno do servidor</div>
      <a href="/" style={{
        marginTop: 24, padding: '10px 28px', background: '#9BDB20',
        color: '#000', borderRadius: 999, fontWeight: 700,
        textDecoration: 'none', fontSize: 14
      }}>Voltar ao início</a>
    </div>
  );
}
