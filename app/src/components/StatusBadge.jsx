const STATUS_MAP = {
  PENDENTE:   { bg: '#FCE300', color: '#000' },
  APROVADO:   { bg: '#9BDB20', color: '#000' },
  ENVIADO:    { bg: '#7CAF34', color: '#fff' },
  PROCESSADO: { bg: '#4E6D1D', color: '#fff' },
  REJEITADO:  { bg: '#FA3A3D', color: '#fff' },
  ATIVO:      { bg: '#9BDB20', color: '#000' },
  ENCERRADO:  { bg: '#808080', color: '#fff' },
  FUTURO:     { bg: '#4A90E2', color: '#fff' },
}

export default function StatusBadge({ status, size = 'normal' }) {
  if (!status) return <span className="badge" style={{ background: '#E0DEDA', color: '#888' }}>—</span>

  const style = STATUS_MAP[status.toUpperCase()] || { bg: '#E0DEDA', color: '#888' }

  return (
    <span
      className="badge"
      style={{
        background: style.bg,
        color: style.color,
        fontSize: size === 'sm' ? '11px' : '12px',
        padding: size === 'sm' ? '3px 8px' : '4px 12px',
      }}
    >
      {status}
    </span>
  )
}
