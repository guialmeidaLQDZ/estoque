import { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import { getEstoque } from '../lib/api'

const CDS = ['Todos', 'Escritório', 'Rio', 'Galpão Eventos', 'Galpão Varejo', 'Rio Varejo']

const CD_KEY_MAP = {
  'Escritório':    'escritorio',
  'Rio':           'rio',
  'Galpão Eventos': 'galpaoEventos',
  'Galpão Varejo': 'galpaoVarejo',
  'Rio Varejo':    'rioVarejo',
}

export default function Estoque() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [cdFilter, setCdFilter] = useState('Todos')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('')

  useEffect(() => {
    getEstoque()
      .then(d => {
        const data = d.data || []
        setProdutos(data)
        if (data.length > 0) {
          const latest = data.reduce((max, p) =>
            p.ultimaAtualizacao > max ? p.ultimaAtualizacao : max,
            data[0].ultimaAtualizacao
          )
          setUltimaAtualizacao(latest)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = [...produtos]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.sku.toLowerCase().includes(q) || p.nome.toLowerCase().includes(q)
      )
    }
    if (cdFilter !== 'Todos') {
      const key = CD_KEY_MAP[cdFilter]
      list = list.filter(p => (p[key] || 0) > 0)
    }
    return list
  }, [produtos, search, cdFilter])

  function downloadCSV() {
    const headers = ['SKU', 'Produto', 'Escritório', 'Rio', 'Galp. Eventos', 'Galp. Varejo', 'Rio Varejo', 'Total']
    const rows = filtered.map(p => [
      p.sku, p.nome, p.escritorio, p.rio, p.galpaoEventos, p.galpaoVarejo, p.rioVarejo, p.total
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `estoque-liquidz-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function rowClass(total) {
    if (total < 20) return 'row-critical'
    if (total < 50) return 'row-warning'
    return ''
  }

  return (
    <Layout currentPage="estoque" title="Base de Produtos">
      <div className="card">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 16 }}>Produtos em Estoque</h2>
            {ultimaAtualizacao && (
              <div style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>
                Última atualização: {new Date(ultimaAtualizacao).toLocaleString('pt-BR')}
              </div>
            )}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={downloadCSV}>
            ↓ Exportar CSV
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Buscar por SKU ou nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
          <select
            value={cdFilter}
            onChange={e => setCdFilter(e.target.value)}
            style={{ width: 180 }}
          >
            {CDS.map(cd => (
              <option key={cd} value={cd}>{cd}</option>
            ))}
          </select>
          {(search || cdFilter !== 'Todos') && (
            <button
              className="btn-ghost btn"
              onClick={() => { setSearch(''); setCdFilter('Todos') }}
            >
              Limpar
            </button>
          )}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 12, color: '#888' }}>
          <span style={{ borderLeft: '3px solid #FCE300', paddingLeft: 8 }}>Total abaixo de 50</span>
          <span style={{ borderLeft: '3px solid #FA3A3D', paddingLeft: 8 }}>Total abaixo de 20 (crítico)</span>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {loading ? (
          <div className="loading-center">
            <div className="spinner" />
            Carregando produtos...
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Produto</th>
                    <th style={{ textAlign: 'right' }}>Escritório</th>
                    <th style={{ textAlign: 'right' }}>Rio</th>
                    <th style={{ textAlign: 'right' }}>Galp. Eventos</th>
                    <th style={{ textAlign: 'right' }}>Galp. Varejo</th>
                    <th style={{ textAlign: 'right' }}>Rio Varejo</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
                        Nenhum produto encontrado
                      </td>
                    </tr>
                  ) : (
                    filtered.map(p => (
                      <tr key={p.sku} className={rowClass(p.total)}>
                        <td>
                          <span style={{
                            background: '#F0EDE8',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontFamily: 'monospace',
                            fontSize: 12,
                            fontWeight: 700,
                          }}>
                            {p.sku}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{p.nome}</td>
                        <td style={{ textAlign: 'right' }}>{p.escritorio}</td>
                        <td style={{ textAlign: 'right' }}>{p.rio}</td>
                        <td style={{ textAlign: 'right' }}>{p.galpaoEventos}</td>
                        <td style={{ textAlign: 'right' }}>{p.galpaoVarejo}</td>
                        <td style={{ textAlign: 'right' }}>{p.rioVarejo}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 15 }}>
                          {p.total.toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 16, color: '#888', fontSize: 13 }}>
              {filtered.length} produto{filtered.length !== 1 ? 's' : ''} exibido{filtered.length !== 1 ? 's' : ''}
              {produtos.length !== filtered.length ? ` (de ${produtos.length} total)` : ''}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
