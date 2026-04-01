import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import { getFinanceiro } from '../lib/api'

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

export default function Financeiro() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    getFinanceiro()
      .then(d => setData(d.data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const totalMovimentado = data.reduce((sum, r) => sum + (r.valorTotal || 0), 0)
  const pendenteNF = data.filter(r => r.statusNF === 'PENDENTE').length
  const processadas = data.filter(r => r.statusNF === 'PROCESSADO').length

  async function handleGerarPDF(row) {
    try {
      const slug = encodeURIComponent(row.evento.replace(/\s+/g, '-'))
      const res = await fetch(`/api/pdf/${slug}`)
      const d = await res.json()
      showToast(d.message || 'PDF gerado com sucesso!', 'success')
    } catch (err) {
      showToast('Erro ao gerar PDF: ' + err.message, 'error')
    }
  }

  return (
    <Layout currentPage="financeiro" title="Financeiro / NF">
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-number">{formatCurrency(totalMovimentado)}</div>
          <div className="kpi-label">Total Movimentado</div>
        </div>
        <div className="kpi-card" style={{ borderLeftColor: pendenteNF > 0 ? '#FCE300' : '#9BDB20' }}>
          <div className="kpi-number">{pendenteNF}</div>
          <div className="kpi-label">Pendentes de NF</div>
        </div>
        <div className="kpi-card" style={{ borderLeftColor: '#4E6D1D' }}>
          <div className="kpi-number">{processadas}</div>
          <div className="kpi-label">NFs Processadas</div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="section-header" style={{ marginBottom: 20 }}>
          <h2 className="section-title">Resumo Financeiro por Evento</h2>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {loading ? (
          <div className="loading-center">
            <div className="spinner" />
            Carregando dados financeiros...
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Precisa NF</th>
                  <th style={{ textAlign: 'right' }}>Valor Total</th>
                  <th>Responsável</th>
                  <th>Status NF</th>
                  <th>ClickUp</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
                      Nenhum registro encontrado
                    </td>
                  </tr>
                ) : (
                  data.map((row, i) => (
                    <tr
                      key={i}
                      style={{
                        background: row.statusNF === 'PENDENTE' ? '#FFFBEA' : 'transparent',
                      }}
                    >
                      <td style={{ fontWeight: 700 }}>{row.evento}</td>
                      <td>
                        <span style={{
                          fontWeight: 700,
                          color: row.precisaNF === 'SIM' ? '#B8860B' : '#4E6D1D',
                        }}>
                          {row.precisaNF || '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatCurrency(row.valorTotal)}
                      </td>
                      <td>{row.responsavel}</td>
                      <td>
                        <StatusBadge
                          status={row.statusNF === 'PROCESSADO' ? 'PROCESSADO' : 'PENDENTE'}
                          size="sm"
                        />
                      </td>
                      <td>
                        {row.urlClickup && row.urlClickup.startsWith('http') ? (
                          <a
                            href={row.urlClickup}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 12,
                              color: '#4A90E2',
                              fontWeight: 600,
                              textDecoration: 'underline',
                            }}
                          >
                            Abrir card
                          </a>
                        ) : '—'}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm"
                          style={{
                            background: '#F0EDE8',
                            color: '#000',
                            borderRadius: 999,
                            fontFamily: 'Manrope',
                            fontWeight: 700,
                            fontSize: 12,
                            border: 'none',
                            cursor: 'pointer',
                            padding: '6px 14px',
                          }}
                          onClick={() => handleGerarPDF(row)}
                        >
                          Gerar PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
