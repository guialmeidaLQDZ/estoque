import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'

const NAV_ITEMS = [
  { label: 'Dashboard',        icon: '📊', href: '/',                  key: 'dashboard' },
  { label: 'Estoque',          icon: '📦', href: '/estoque',           key: 'estoque' },
  { label: 'Aprovação',        icon: '✅', href: '/aprovacao',         key: 'aprovacao', showBadge: true },
  { label: 'Nova Solicitação', icon: '➕', href: '/solicitacoes/nova', key: 'solicitacoes-nova' },
  { label: 'Solicitações',     icon: '📋', href: '/solicitacoes',      key: 'solicitacoes' },
  { label: 'Eventos',          icon: '🎉', href: '/eventos',           key: 'eventos' },
  { label: 'Financeiro',       icon: '💰', href: '/financeiro',        key: 'financeiro' },
  { label: 'Histórico',        icon: '🕐', href: '/historico',         key: 'historico' },
]

export default function Layout({ children, currentPage, title }) {
  const router = useRouter()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    fetch('/api/solicitacoes?status=PENDENTE')
      .then(r => r.json())
      .then(d => {
        if (d.success) setPendingCount(d.data.length)
      })
      .catch(() => {})
  }, [])

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const pageTitle = title || NAV_ITEMS.find(i => i.key === currentPage)?.label || 'LIQUIDZ'

  function isActive(item) {
    if (item.href === '/') return router.pathname === '/'
    return router.pathname.startsWith(item.href)
  }

  return (
    <div>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-text">
            LIQUIDZ<span className="sidebar-logo-dot" />
          </span>
          <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>Gestão de Estoque</div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.key}
              href={item.href}
              className={`sidebar-item${isActive(item) ? ' active' : ''}`}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.showBadge && pendingCount > 0 && (
                <span className="sidebar-badge">{pendingCount}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-user">Guilherme</span>
          <span className="sidebar-signout">Sair</span>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-content">
        <div className="topbar">
          <div className="topbar-left">
            <h1 className="topbar-title">{pageTitle}</h1>
            <p className="topbar-subtitle">Gestão de Estoque · LIQUIDZ</p>
          </div>
          <div className="topbar-date">{today}</div>
        </div>

        <div className="page-body">
          {children}
        </div>
      </div>
    </div>
  )
}
