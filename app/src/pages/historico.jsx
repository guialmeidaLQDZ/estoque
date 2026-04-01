import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import { getHistorico } from '../lib/api'

const PAGE_SIZE = 20

const CDS = ['', 'Escritório', 'Rio', 'Galpão Eventos', 'Galpão Varejo', 'Rio Varejo']
const TIPOS = ['', 'Entrada', 'Saída']

export default function Historico() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const [filters, setFilters] = useState({
    from: '',
    to: '',
    cd: '',
    tipo: '',
    q: '',
  })
  const [appliedFilters, setAppliedFilters] = useState(filters)

  useEffect(() => {
    fetchData(appliedFilters, page)
  }, [appliedFilters, page])

  function fetchData(f, p) {
    setLoading(true)
    getHistorico({ ...f, page: p, limit: PAGE_SIZE })
      .then(d => {
        setData(d.data || [])
        setTotal(d.total || 0)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  function applyFilters() {
    setPage(1)
    setAppliedFilters({ ...filters })
  }

  function clearFilters() {
    const empty = { from: '', to: '', cd: '', tipo: '', q: '' }
    setFilters(empty)
    setAppliedFilters(empty)
    setPage(1)
  }

  function downloadCSV() {
    getHistorico({ ...appliedFilters, limit: 10000 }).then(d => {
      const rows = d.data || []
      const headers = ['Timestamp', 'SKU', 'Produto', 'Qtd', 'Tipo', 'CD', 'Evento', 'Status Logística', 'Status Financeiro']
      const csv = [
        headers.join(','),
        ...rows.map(r => [
          r.timestamp, r.sku, `"${r.nome}"`, r.quantidade, r.tipo, `"${r.cd}"`,
          `"${r.evento || ''}"`, r.statusLogistica, r.statusFinanceiro || ''
        ].join(','))
      ].join('\n')

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `historico-liquidz-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  function formatDate(ts) {
    if (!ts) return '—'
    return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <Layout currentPage="historico" title="Histórico de Movimentações">
      {/* Filter card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div>
            <label className="form-label">De</label>
            <input
              type="date"
              value={filters.from}
              onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
            />
          </div>
          <div>
            <label className="form-label">Até</label>
            <input
              type="date"
              value={filters.to}
              onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
            />
          </div>
          <div>
            <label className="form-label">CD</label>
            <select value={filters.cd} onChange={e => setFilters(f => ({ ...f, cd: e.target.value }))}>
              <option value="">Todos</option>
              {CDS.filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Tipo</label>
            <select value={filters.tipo} onChange={e => setFilters(f => ({ ...f, tipo: e.target.value }))}>
              <option value="">Todos</option>
              {TIPOS.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Busca</label>
            <input
              type="text"
              placeholder="SKU, produto, evento..."
              value={filters.q}
              onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-primary btn-sm" onClick={applyFilters}>
            Filtrar
          </button>
          <button className="btn-ghost btn btn-sm" onClick={clearFilters}>
            Limpar
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary btn-sm" onClick={downloadCSV}>
            ↓ Exportar CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="section-title">
            {total} movimentaç{total !== 1 ? 'ões' : 'ão'} encontrada{total !== 1 ? 's' : ''}
          </h2>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {loading ? (
          <div className="loading-center">
            <div className="spinner" />
            Carregando histórico...
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>SKU</th>
                    <th>Produto</th>
                    <th style={{ textAlign: 'right' }}>Qtd</th>
                    <th>CD</th>
                    <th>Evento</th>
                    <th>Status Log.</th>
                    <th>Status Fin.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
                        Nenhuma movimentação encontrada
                      </td>
                    </tr>
                  ) : (
                    data.map((item, i) => (
                      <tr key={i}>
                        <td style={{ color: '#888', fontSize: 12, whiteSpace: 'nowrap' }}>
                          {formatDate(item.timestamp)}
                        </td>
                        <td>
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: 12,
                            background: '#F0EDE8',
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}>
                            {item.sku}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{item.nome}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{
                            fontWeight: 700,
                            color: item.tipo === 'Entrada' ? '#4E6D1D' : '#FA3A3D',
                          }}>
                            {item.tipo === 'Entrada' ? '+' : '-'}{item.quantidade}
                          </span>
                        </td>
                        <td style={{ fontSize: 13 }}>{item.cd}</td>
                        <td style={{ color: '#888', fontSize: 12 }}>{item.evento || '—'}</td>
                        <td>
                          {item.statusLogistica
                            ? <StatusBadge status={item.statusLogistica} size="sm" />
                            : '—'
                          }
                        </td>
                        <td>
                          {item.statusFinanceiro
                            ? <StatusBadge status={item.statusFinanceiro} size="sm" />
                            : <span style={{ color: '#ccc' }}>—</span>
                          }
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <div className="pagination-info">
                Exibindo {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} de {total}
              </div>
              <button
                className="pagination-btn"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← Anterior
              </button>
              {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                const p = i + 1
                return (
                  <button
                    key={p}
                    className="pagination-btn"
                    onClick={() => setPage(p)}
                    style={{
                      background: page === p ? '#000' : '#fff',
                      color: page === p ? '#fff' : '#000',
                      borderColor: page === p ? '#000' : '#E0DEDA',
                    }}
                  >
                    {p}
                  </button>
                )
              })}
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
