import { useState, useEffect, useMemo } from 'react'
import Layout from '../../components/Layout'
import StatusBadge from '../../components/StatusBadge'
import { getSolicitacoes } from '../../lib/api'
import { useRouter } from 'next/router'

const TABS = [
  { label: 'Todas',     value: '' },
  { label: 'Pendentes', value: 'PENDENTE' },
  { label: 'Aprovadas', value: 'APROVADO' },
  { label: 'Enviadas',  value: 'ENVIADO' },
  { label: 'Rejeitadas',value: 'REJEITADO' },
]

const PAGE_SIZE = 10

export default function Solicitacoes() {
  const router = useRouter()
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    setLoading(true)
    getSolicitacoes()
      .then(d => setAll(d.data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const counts = useMemo(() => {
    const c = {}
    all.forEach(s => { c[s.status] = (c[s.status] || 0) + 1 })
    return c
  }, [all])

  const filtered = useMemo(() => {
    let list = [...all]
    if (activeTab) list = list.filter(s => s.status === activeTab)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        s.id.toLowerCase().includes(q) ||
        s.solicitante.toLowerCase().includes(q) ||
        s.cd.toLowerCase().includes(q) ||
        s.evento?.toLowerCase().includes(q)
      )
    }
    return list
  }, [all, activeTab, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function changeTab(v) {
    setActiveTab(v)
    setPage(1)
  }

  function handleSearch(e) {
    setSearch(e.target.value)
    setPage(1)
  }

  async function handlePDF(id) {
    try {
      const res = await fetch(`/api/pdf/${id}`)
      const data = await res.json()
      if (data.success) {
        showToast(data.message || 'PDF gerado com sucesso!', 'success')
      } else {
        showToast('Erro ao gerar PDF', 'error')
      }
    } catch (err) {
      showToast('Erro: ' + err.message, 'error')
    }
  }

  function formatDate(ts) {
    if (!ts) return '—'
    return new Date(ts).toLocaleDateString('pt-BR')
  }

  return (
    <Layout currentPage="solicitacoes" title="Solicitações">
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
          </div>
        </div>
      )}

      <div className="card">
        {/* Tabs + Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div className="filter-tabs">
            {TABS.map(tab => (
              <button
                key={tab.value}
                className={`filter-tab${activeTab === tab.value ? ' active' : ''}`}
                onClick={() => changeTab(tab.value)}
              >
                {tab.label}
                {tab.value === '' ? (
                  <span className="tab-count">{all.length}</span>
                ) : counts[tab.value] ? (
                  <span className="tab-count">{counts[tab.value]}</span>
                ) : null}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={handleSearch}
              style={{ width: 220 }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={() => router.push('/solicitacoes/nova')}
            >
              + Nova
            </button>
          </div>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {loading ? (
          <div className="loading-center">
            <div className="spinner" />
            Carregando solicitações...
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Data</th>
                    <th>Solicitante</th>
                    <th>CD</th>
                    <th>Evento</th>
                    <th style={{ textAlign: 'center' }}>Itens</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
                        Nenhuma solicitação encontrada
                      </td>
                    </tr>
                  ) : (
                    paginated.map((sol) => (
                      <tr key={sol.id}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>
                            {sol.id.replace('SOL-', '')}
                          </span>
                        </td>
                        <td style={{ color: '#888', fontSize: 12 }}>{formatDate(sol.timestamp)}</td>
                        <td style={{ fontWeight: 600 }}>{sol.solicitante}</td>
                        <td>{sol.cd}</td>
                        <td style={{ color: '#888', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sol.evento || '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 700 }}>{sol.itens?.length || 0}</span>
                        </td>
                        <td><StatusBadge status={sol.status} size="sm" /></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => alert(`Detalhes: ${sol.id}\nStatus: ${sol.status}\nSolicitante: ${sol.solicitante}\nJustificativa: ${sol.justificativa || '—'}`)}
                            >
                              Ver
                            </button>
                            {(sol.status === 'ENVIADO' || sol.status === 'APROVADO') && (
                              <button
                                className="btn btn-sm"
                                style={{ background: '#F0EDE8', color: '#000', borderRadius: 999, fontFamily: 'Manrope', fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer', padding: '6px 14px' }}
                                onClick={() => handlePDF(sol.id)}
                              >
                                PDF
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <div className="pagination-info">
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} · Página {page} de {totalPages}
              </div>
              <button
                className="pagination-btn"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← Anterior
              </button>
              <button
                className="pagination-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Próxima →
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
