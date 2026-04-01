import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import ConfirmModal from '../components/ConfirmModal'
import { getSolicitacoes, aprovarSolicitacao, rejeitarSolicitacao } from '../lib/api'

function ImpactoIcon({ impacto }) {
  if (!impacto) return null
  const num = parseInt(impacto)
  if (num > 50) return <span style={{ color: '#4E6D1D' }}>🟢</span>
  if (num > 0)  return <span style={{ color: '#B8860B' }}>🟡</span>
  return <span style={{ color: '#FA3A3D' }}>🔴</span>
}

export default function Aprovacao() {
  const [solicitacoes, setSolicitacoes] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [comentario, setComentario] = useState('')
  const [error, setError] = useState(null)
  const [modal, setModal] = useState({ open: false, type: null })
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    loadData()
  }, [])

  function loadData() {
    setLoading(true)
    getSolicitacoes('PENDENTE')
      .then(d => setSolicitacoes(d.data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  function handleSelect(sol) {
    setSelected(sol)
    setComentario('')
  }

  function openModal(type) {
    setModal({ open: true, type })
  }

  async function handleConfirm() {
    if (!selected) return
    setActionLoading(true)
    setModal({ open: false, type: null })

    try {
      if (modal.type === 'aprovar') {
        await aprovarSolicitacao(selected.id, comentario)
        showToast(`Solicitação ${selected.id} aprovada com sucesso!`, 'success')
      } else {
        await rejeitarSolicitacao(selected.id, comentario)
        showToast(`Solicitação ${selected.id} rejeitada.`, 'success')
      }
      setSelected(null)
      setComentario('')
      loadData()
    } catch (err) {
      showToast('Erro ao processar solicitação: ' + err.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  function formatDate(ts) {
    if (!ts) return '—'
    return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Layout currentPage="aprovacao" title="Aprovação de Solicitações">
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={modal.open}
        title={modal.type === 'aprovar' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
        message={modal.type === 'aprovar'
          ? `Deseja aprovar a solicitação ${selected?.id}? Esta ação irá registrar as movimentações no histórico.`
          : `Deseja rejeitar a solicitação ${selected?.id}? O solicitante será notificado.`
        }
        confirmLabel={modal.type === 'aprovar' ? 'Aprovar' : 'Rejeitar'}
        confirmVariant={modal.type === 'aprovar' ? 'primary' : 'danger'}
        onConfirm={handleConfirm}
        onCancel={() => setModal({ open: false, type: null })}
      />

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Left panel */}
        <div style={{ width: 380, flexShrink: 0 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E6E6E6', display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontWeight: 700, fontSize: 15 }}>Pendentes de Aprovação</h2>
              <span className="badge" style={{ background: '#FA3A3D', color: '#fff' }}>
                {solicitacoes.length}
              </span>
            </div>

            {loading ? (
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80 }} />)}
              </div>
            ) : solicitacoes.length === 0 ? (
              <div className="empty-state" style={{ padding: '48px 20px' }}>
                <div className="empty-state-icon">🎉</div>
                <div className="empty-state-text">Nenhuma pendência</div>
                <div className="empty-state-sub">Todas as solicitações foram processadas</div>
              </div>
            ) : (
              <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                {solicitacoes.map(sol => (
                  <div
                    key={sol.id}
                    onClick={() => handleSelect(sol)}
                    style={{
                      padding: '14px 20px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #F0EDE8',
                      borderLeft: selected?.id === sol.id ? '3px solid #9BDB20' : '3px solid transparent',
                      background: selected?.id === sol.id ? '#FAFEF5' : '#fff',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{sol.id}</span>
                      <span style={{ fontSize: 11, color: '#aaa' }}>{formatDate(sol.timestamp)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>
                      <strong>{sol.solicitante}</strong> · {sol.cd}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {sol.evento && (
                        <span style={{ fontSize: 11, background: '#F0EDE8', padding: '2px 8px', borderRadius: 4, color: '#555' }}>
                          {sol.evento}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: '#aaa' }}>
                        {sol.itens?.length || 0} iten{(sol.itens?.length || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ flex: 1 }}>
          {!selected ? (
            <div className="card">
              <div className="empty-state" style={{ padding: '80px 40px' }}>
                <div className="empty-state-icon">👈</div>
                <div className="empty-state-text">Selecione uma solicitação</div>
                <div className="empty-state-sub">Clique em uma solicitação à esquerda para ver os detalhes e aprovar ou rejeitar</div>
              </div>
            </div>
          ) : (
            <div className="card">
              {/* Header info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>{selected.id}</h2>
                  <StatusBadge status={selected.status} />
                </div>
                <span style={{ color: '#aaa', fontSize: 12 }}>{formatDate(selected.timestamp)}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                {[
                  { label: 'Solicitante', value: selected.solicitante },
                  { label: 'Email', value: selected.email },
                  { label: 'CD Destino', value: selected.cd },
                  { label: 'Evento', value: selected.evento || '—' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: '#F8F6F3', padding: '12px 16px', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                    <div style={{ fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>

              {selected.justificativa && (
                <div className="alert-warning" style={{ marginBottom: 24 }}>
                  <strong>Justificativa:</strong> {selected.justificativa}
                </div>
              )}

              {/* Items table */}
              <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Itens Solicitados</h3>
              <div className="table-wrapper" style={{ marginBottom: 24 }}>
                <table>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Produto</th>
                      <th style={{ textAlign: 'right' }}>Qtd</th>
                      <th>Tipo</th>
                      <th>Impacto Estoque</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selected.itens || []).map((item, i) => (
                      <tr key={i}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#F0EDE8', padding: '2px 6px', borderRadius: 4 }}>
                            {item.sku}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{item.nome}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{item.quantidade}</td>
                        <td>
                          <span style={{
                            color: item.tipo === 'Entrada' ? '#4E6D1D' : '#FA3A3D',
                            fontWeight: 700,
                            fontSize: 13,
                          }}>
                            {item.tipo === 'Entrada' ? '↑ Entrada' : '↓ Saída'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ImpactoIcon impacto={item.impactoEstoque} />
                            <span style={{ fontWeight: 600 }}>{item.impactoEstoque}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Comment */}
              <div className="form-group">
                <label className="form-label">Comentário (opcional)</label>
                <textarea
                  value={comentario}
                  onChange={e => setComentario(e.target.value)}
                  placeholder="Adicione um comentário para o solicitante..."
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-danger"
                  onClick={() => openModal('rejeitar')}
                  disabled={actionLoading}
                >
                  ✗ Rejeitar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => openModal('aprovar')}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processando...' : '✓ Aprovar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
