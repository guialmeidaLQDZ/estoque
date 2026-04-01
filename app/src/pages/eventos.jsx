import { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import { getEventos, criarEvento } from '../lib/api'

const FILTERS = ['Todos', 'Ativos', 'Futuros', 'Encerrados']

const STATUS_COLORS = {
  ATIVO:     '#9BDB20',
  ENCERRADO: '#808080',
  FUTURO:    '#4A90E2',
}

const FORM_EMPTY = { nome: '', dataInicio: '', dataFim: '', responsavel: '', observacoes: '' }

function dateRange(inicio, fim) {
  const opts = { day: '2-digit', month: 'short', year: 'numeric' }
  const start = new Date(inicio).toLocaleDateString('pt-BR', opts)
  const end = new Date(fim).toLocaleDateString('pt-BR', opts)
  if (inicio === fim) return start
  return `${start} → ${end}`
}

function getEventoStatus(ev) {
  const now = new Date()
  const inicio = new Date(ev.dataInicio)
  const fim = new Date(ev.dataFim + 'T23:59:59')
  if (ev.status === 'ENCERRADO') return 'ENCERRADO'
  if (now < inicio) return 'FUTURO'
  if (now > fim) return 'ENCERRADO'
  return 'ATIVO'
}

export default function Eventos() {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(FORM_EMPTY)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function loadEventos() {
    setLoading(true)
    getEventos()
      .then(d => setEventos(d.data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadEventos() }, [])

  const filtered = useMemo(() => {
    if (filter === 'Todos') return eventos
    const map = { Ativos: 'ATIVO', Futuros: 'FUTURO', Encerrados: 'ENCERRADO' }
    const target = map[filter]
    return eventos.filter(ev => getEventoStatus(ev) === target)
  }, [eventos, filter])

  const counts = useMemo(() => {
    const c = { Todos: eventos.length, Ativos: 0, Futuros: 0, Encerrados: 0 }
    eventos.forEach(ev => {
      const s = getEventoStatus(ev)
      if (s === 'ATIVO') c.Ativos++
      else if (s === 'FUTURO') c.Futuros++
      else c.Encerrados++
    })
    return c
  }, [eventos])

  function handleFormChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome || !form.dataInicio || !form.dataFim) return
    setSaving(true)
    try {
      await criarEvento(form)
      showToast('Evento criado com sucesso!')
      setShowModal(false)
      setForm(FORM_EMPTY)
      loadEventos()
    } catch (err) {
      showToast('Erro ao criar evento: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout currentPage="eventos" title="Eventos">
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
          </div>
        </div>
      )}

      {/* Filter + New button */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="filter-tabs">
          {FILTERS.map(f => (
            <button
              key={f}
              className={`filter-tab${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
              <span className="tab-count">{counts[f]}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Novo Evento
        </button>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 200, borderRadius: 12 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🎉</div>
            <div className="empty-state-text">Nenhum evento encontrado</div>
            <div className="empty-state-sub">Nenhum evento corresponde ao filtro selecionado</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {filtered.map((ev, i) => {
            const status = getEventoStatus(ev)
            const color = STATUS_COLORS[status] || '#808080'

            return (
              <div
                key={i}
                className="card"
                style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              >
                {/* Color stripe */}
                <div style={{ height: 6, background: color }} />

                <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <h3 style={{ fontWeight: 800, fontSize: 17, lineHeight: 1.3, flex: 1 }}>{ev.nome}</h3>
                    <StatusBadge status={status} size="sm" />
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      background: '#F0EDE8',
                      color: '#555',
                      padding: '3px 10px',
                      borderRadius: 999,
                    }}>
                      {ev.cd}
                    </span>
                  </div>

                  <div style={{ fontSize: 13, color: '#555', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>📅</span>
                    <span>{dateRange(ev.dataInicio, ev.dataFim)}</span>
                  </div>

                  <div style={{ fontSize: 13, color: '#555', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>👤</span>
                    <span>{ev.responsavel}</span>
                  </div>

                  {ev.observacoes && (
                    <p style={{
                      fontSize: 13,
                      color: '#888',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      flex: 1,
                      marginBottom: 16,
                    }}>
                      {ev.observacoes}
                    </p>
                  )}

                  <div style={{ marginTop: 'auto' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => alert(`${ev.nome}\n\nCD: ${ev.cd}\nPeríodo: ${dateRange(ev.dataInicio, ev.dataFim)}\nResponsável: ${ev.responsavel}\nStatus: ${status}\n\n${ev.observacoes || ''}`)}
                    >
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal — Novo Evento */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-box"
            style={{ maxWidth: 520, width: '100%' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="modal-title" style={{ marginBottom: 20 }}>Novo Evento</h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                  Nome do evento *
                </label>
                <input
                  name="nome"
                  value={form.nome}
                  onChange={handleFormChange}
                  required
                  placeholder="Ex: Evento São Paulo 2026"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #D0CCC8', borderRadius: 8, fontFamily: 'Manrope', fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                    Data início *
                  </label>
                  <input
                    type="date"
                    name="dataInicio"
                    value={form.dataInicio}
                    onChange={handleFormChange}
                    required
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #D0CCC8', borderRadius: 8, fontFamily: 'Manrope', fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                    Data fim *
                  </label>
                  <input
                    type="date"
                    name="dataFim"
                    value={form.dataFim}
                    onChange={handleFormChange}
                    required
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #D0CCC8', borderRadius: 8, fontFamily: 'Manrope', fontSize: 14 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                  Responsável
                </label>
                <input
                  name="responsavel"
                  value={form.responsavel}
                  onChange={handleFormChange}
                  placeholder="Nome do responsável"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #D0CCC8', borderRadius: 8, fontFamily: 'Manrope', fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                  Observações
                </label>
                <textarea
                  name="observacoes"
                  value={form.observacoes}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="Informações adicionais..."
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #D0CCC8', borderRadius: 8, fontFamily: 'Manrope', fontSize: 14, resize: 'vertical' }}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setShowModal(false); setForm(FORM_EMPTY) }}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Criar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
