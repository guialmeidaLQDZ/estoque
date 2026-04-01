import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { getEstoque, getEventos, criarSolicitacao } from '../../lib/api'
import { useRouter } from 'next/router'

const CDS = ['Escritório', 'Rio', 'Galpão Eventos', 'Galpão Varejo', 'Rio Varejo']

const CD_KEY_MAP = {
  'Escritório':    'escritorio',
  'Rio':           'rio',
  'Galpão Eventos': 'galpaoEventos',
  'Galpão Varejo': 'galpaoVarejo',
  'Rio Varejo':    'rioVarejo',
}

function emptyItem() {
  return { sku: '', nome: '', quantidade: '', estoqueAtual: '', tipo: 'Entrada' }
}

export default function NovaSolicitacao() {
  const router = useRouter()
  const [produtos, setProdutos] = useState([])
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  const [tipo, setTipo] = useState('Entrada')
  const [cd, setCd] = useState('')
  const [evento, setEvento] = useState('')
  const [solicitante, setSolicitante] = useState('Guilherme')
  const [justificativa, setJustificativa] = useState('')
  const [itens, setItens] = useState([emptyItem()])
  const [errors, setErrors] = useState({})
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    Promise.all([getEstoque(), getEventos()])
      .then(([est, ev]) => {
        setProdutos(est.data || [])
        setEventos((ev.data || []).filter(e => e.status === 'ATIVO'))
      })
      .catch(console.error)
      .finally(() => setLoadingData(false))
  }, [])

  function handleSkuBlur(index, sku) {
    if (!sku) return
    const produto = produtos.find(p => p.sku.toLowerCase() === sku.toLowerCase())
    if (produto) {
      const cdKey = CD_KEY_MAP[cd] || 'total'
      const estoqueAtual = produto[cdKey] ?? produto.total
      updateItem(index, {
        sku: produto.sku,
        nome: produto.nome,
        estoqueAtual,
      })
    }
  }

  function updateItem(index, changes) {
    setItens(prev => prev.map((item, i) => i === index ? { ...item, ...changes } : item))
  }

  function addItem() {
    setItens(prev => [...prev, emptyItem()])
  }

  function removeItem(index) {
    setItens(prev => prev.filter((_, i) => i !== index))
  }

  function calcImpacto(item) {
    const qty = parseInt(item.quantidade) || 0
    const est = parseInt(item.estoqueAtual) || 0
    const delta = item.tipo === 'Entrada' ? qty : -qty
    const novo = est + delta
    return { delta, novo }
  }

  function validate() {
    const errs = {}
    if (!cd) errs.cd = 'Selecione o CD'
    if (!solicitante.trim()) errs.solicitante = 'Informe o solicitante'
    if (itens.length === 0) errs.itens = 'Adicione pelo menos um item'
    itens.forEach((item, i) => {
      if (!item.sku) errs[`item_sku_${i}`] = 'SKU obrigatório'
      if (!item.nome) errs[`item_nome_${i}`] = 'Nome obrigatório'
      if (!item.quantidade || parseInt(item.quantidade) <= 0) errs[`item_qty_${i}`] = 'Quantidade inválida'
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) {
      showToast('Corrija os erros antes de enviar', 'error')
      return
    }

    setLoading(true)
    try {
      const payload = {
        tipo,
        cd,
        evento,
        solicitante,
        email: 'guilherme.almeida@liquidz.com.br',
        justificativa,
        itens: itens.map(item => ({
          sku: item.sku,
          nome: item.nome,
          quantidade: parseInt(item.quantidade),
          tipo: item.tipo || tipo,
          impactoEstoque: `${item.tipo === 'Entrada' ? '+' : '-'}${item.quantidade}`,
        })),
      }

      const res = await criarSolicitacao(payload)
      if (res.success) {
        showToast(`Solicitação ${res.data?.id || ''} criada com sucesso!`, 'success')
        setTimeout(() => router.push('/solicitacoes'), 1500)
      } else {
        showToast('Erro ao criar solicitação', 'error')
      }
    } catch (err) {
      showToast('Erro: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout currentPage="solicitacoes-nova" title="Nova Solicitação">
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Seção 1: Cabeçalho */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontWeight: 800, fontSize: 16, marginBottom: 20 }}>1 · Informações da Solicitação</h2>

          <div className="form-group">
            <label className="form-label required">Tipo de Movimentação</label>
            <div className="radio-group">
              <div className="radio-pill">
                <input
                  type="radio"
                  id="tipo-entrada"
                  name="tipo"
                  value="Entrada"
                  checked={tipo === 'Entrada'}
                  onChange={() => setTipo('Entrada')}
                />
                <label htmlFor="tipo-entrada">↑ Entrada</label>
              </div>
              <div className="radio-pill">
                <input
                  type="radio"
                  id="tipo-saida"
                  name="tipo"
                  value="Saída"
                  checked={tipo === 'Saída'}
                  onChange={() => setTipo('Saída')}
                />
                <label htmlFor="tipo-saida">↓ Saída</label>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label required">CD Destino</label>
              <select value={cd} onChange={e => setCd(e.target.value)}>
                <option value="">Selecione o CD...</option>
                {CDS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.cd && <div style={{ color: '#FA3A3D', fontSize: 12, marginTop: 4 }}>{errors.cd}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Evento</label>
              <select value={evento} onChange={e => setEvento(e.target.value)}>
                <option value="">Sem evento</option>
                {loadingData ? (
                  <option disabled>Carregando...</option>
                ) : (
                  eventos.map(ev => (
                    <option key={ev.nome} value={ev.nome}>{ev.nome}</option>
                  ))
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label required">Solicitante</label>
              <input
                type="text"
                value={solicitante}
                onChange={e => setSolicitante(e.target.value)}
                placeholder="Nome do solicitante"
              />
              {errors.solicitante && <div style={{ color: '#FA3A3D', fontSize: 12, marginTop: 4 }}>{errors.solicitante}</div>}
            </div>

            <div className="form-group" style={{ gridColumn: 'span 1' }}>
              <label className="form-label">Justificativa</label>
              <textarea
                value={justificativa}
                onChange={e => setJustificativa(e.target.value)}
                placeholder="Descreva o motivo da solicitação..."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Seção 2: Itens */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontWeight: 800, fontSize: 16 }}>2 · Itens</h2>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>
              + Adicionar Item
            </button>
          </div>

          {errors.itens && <div className="alert-error" style={{ marginBottom: 16 }}>{errors.itens}</div>}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: 800 }}>
              <thead>
                <tr>
                  <th style={{ width: 130 }}>SKU</th>
                  <th>Produto</th>
                  <th style={{ width: 100, textAlign: 'center' }}>Qtd</th>
                  <th style={{ width: 130, textAlign: 'center' }}>Estoque Atual</th>
                  <th style={{ width: 180, textAlign: 'center' }}>Impacto</th>
                  <th style={{ width: 48 }}></th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item, i) => {
                  const { delta, novo } = calcImpacto(item)
                  const hasStock = item.estoqueAtual !== ''
                  const impactColor = novo < 0 ? '#FA3A3D' : novo < 20 ? '#B8860B' : '#4E6D1D'

                  return (
                    <tr key={i}>
                      <td>
                        <input
                          type="text"
                          value={item.sku}
                          onChange={e => updateItem(i, { sku: e.target.value })}
                          onBlur={e => handleSkuBlur(i, e.target.value)}
                          placeholder="LQZ-001"
                          style={{ borderColor: errors[`item_sku_${i}`] ? '#FA3A3D' : undefined }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.nome}
                          onChange={e => updateItem(i, { nome: e.target.value })}
                          placeholder="Nome do produto"
                          style={{ borderColor: errors[`item_nome_${i}`] ? '#FA3A3D' : undefined }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.quantidade}
                          onChange={e => updateItem(i, { quantidade: e.target.value })}
                          min={1}
                          placeholder="0"
                          style={{
                            textAlign: 'center',
                            borderColor: errors[`item_qty_${i}`] ? '#FA3A3D' : undefined,
                          }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="text"
                          value={hasStock ? item.estoqueAtual : '—'}
                          readOnly
                          style={{ textAlign: 'center', width: '100%' }}
                        />
                      </td>
                      <td>
                        {hasStock && item.quantidade ? (
                          <div style={{
                            textAlign: 'center',
                            fontWeight: 700,
                            fontSize: 14,
                            color: impactColor,
                            background: `${impactColor}18`,
                            borderRadius: 8,
                            padding: '6px 8px',
                          }}>
                            {delta > 0 ? '+' : ''}{delta} → <strong>{novo}</strong>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', color: '#ccc', fontSize: 12 }}>—</div>
                        )}
                      </td>
                      <td>
                        {itens.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(i)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: 18,
                              color: '#FA3A3D',
                              padding: '4px 8px',
                              borderRadius: 4,
                            }}
                            title="Remover"
                          >
                            🗑
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: '#aaa' }}>
            💡 Digite o SKU e clique fora do campo para buscar o produto automaticamente
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push('/solicitacoes')}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Enviando...' : 'Enviar Solicitação'}
          </button>
        </div>
      </form>
    </Layout>
  )
}
