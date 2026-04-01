import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import { getEstoque, getHistorico, getSolicitacoes, getEventos } from '../lib/api'
import Link from 'next/link'

const CD_KEYS = [
  { label: 'Escritório',     key: 'escritorio' },
  { label: 'Rio',            key: 'rio' },
  { label: 'Galpão Eventos', key: 'galpaoEventos' },
  { label: 'Galpão Varejo',  key: 'galpaoVarejo' },
  { label: 'Rio Varejo',     key: 'rioVarejo' },
]

function SkeletonCard() {
  return (
    <div className="kpi-card">
      <div className="skeleton" style={{ height: 42, width: 80, marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 14, width: 140 }} />
    </div>
  )
}

function StockStatus({ total }) {
  if (total > 100) return <span style={{ color: '#4E6D1D', fontWeight: 700 }}>🟢 OK</span>
  if (total > 30)  return <span style={{ color: '#B8860B', fontWeight: 700 }}>🟡 Baixo</span>
  return <span style={{ color: '#FA3A3D', fontWeight: 700 }}>🔴 Crítico</span>
}

export default function Dashboard() {
  const [estoque, setEstoque] = useState([])
  const [historico, setHistorico] = useState([])
  const [pendentes, setPendentes] = useState([])
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      getEstoque(),
      getHistorico({ limit: 50 }),
      getSolicitacoes('PENDENTE'),
      getEventos(),
    ]).then(([est, hist, sol, ev]) => {
      setEstoque(est.data || [])
      setHistorico(hist.data || [])
      setPendentes(sol.data || [])
      setEventos(ev.data || [])
    }).catch(err => {
      setError(err.message)
    }).finally(() => setLoading(false))
  }, [])

  const today = new Date().toISOString().split('T')[0]
  const movimentacoesHoje = historico.filter(h => h.data === today).length
  const eventosAtivos = eventos.filter(e => e.status === 'ATIVO').length

  // CD summary: sum across all products
  const cdSummary = CD_KEYS.map(({ label, key }) => {
    const total = estoque.reduce((sum, p) => sum + (p[key] || 0), 0)
    const lastUpdate = estoque.reduce((latest, p) => {
      return p.ultimaAtualizacao > latest ? p.ultimaAtualizacao : latest
    }, '')
    return { label, total, lastUpdate }
  })

  // Low stock alerts
  const alertas = estoque.filter(p => p.total < 50)

  const recentActivity = historico.slice(0, 5)

  function formatDate(ts) {
    if (!ts) return '—'
    return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  function formatDateShort(ts) {
    if (!ts) return '—'
    return new Date(ts).toLocaleDateString('pt-BR')
  }

  return (
    <Layout currentPage="dashboard" title="Dashboard">
      {error && (
        <div className="alert-error" style={{ marginBottom: 24 }}>
          Erro ao carregar dados: {error}
        </div>
      )}

      {/* KPI Row */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            <div className="kpi-card">
              <div className="kpi-number">{estoque.length}</div>
              <div className="kpi-label">Total de SKUs</div>
            </div>
            <div className="kpi-card" style={{ borderLeftColor: '#4A90E2' }}>
              <div className="kpi-number">{movimentacoesHoje}</div>
              <div className="kpi-label">Movimentações Hoje</div>
            </div>
            <div className="kpi-card" style={{ borderLeftColor: pendentes.length > 0 ? '#FA3A3D' : '#9BDB20' }}>
              <div className="kpi-number">{pendentes.length}</div>
              <div className="kpi-label">Pendentes de Aprovação</div>
            </div>
            <div className="kpi-card" style={{ borderLeftColor: '#FCE300' }}>
              <div className="kpi-number">{eventosAtivos}</div>
              <div className="kpi-label">Eventos Ativos</div>
            </div>
          </>
        )}
      </div>

      {/* Atividade Recente */}
      <div className="card">
        <div className="section-header">
          <h2 className="section-title">Atividade Recente</h2>
          <Link href="/historico">
            <button className="btn btn-secondary btn-sm">Ver tudo</button>
          </Link>
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">Nenhuma atividade recente</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', overflowY: 'hidden', border: '1px solid #E6E6E6', borderRadius: 8 }}>
            <table style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Produto</th>
                  <th>Qtd</th>
                  <th>CD</th>
                  <th>Evento</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((item, i) => (
                  <tr key={i}>
                    <td style={{ color: '#888', fontSize: 12 }}>{formatDate(item.timestamp)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.nome}</div>
                      <div style={{ color: '#aaa', fontSize: 11 }}>{item.sku}</div>
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: item.tipo === 'Entrada' ? '#4E6D1D' : '#FA3A3D',
                      }}>
                        {item.tipo === 'Entrada' ? '+' : '-'}{item.quantidade}
                      </span>
                    </td>
                    <td>{item.cd}</td>
                    <td style={{ color: '#888', fontSize: 12 }}>{item.evento || '—'}</td>
                    <td><StatusBadge status={item.statusLogistica} size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
