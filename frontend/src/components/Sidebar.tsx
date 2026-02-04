import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/leads', label: 'Leads', icon: '📥' },
  { path: '/clients', label: 'Clientes', icon: '📇' },
  { path: '/cases', label: 'Casos', icon: '🗂️' },
  { path: '/manual-load', label: 'Cargue Manual', icon: '⬆️', roles: ['admin', 'supervisor'] },
  { path: '/users', label: 'Usuarios', icon: '👥', roles: ['admin'] },
]

export default function Sidebar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const items = NAV_ITEMS.filter(item => !item.roles || item.roles.includes(user!.role))

  return (
    <nav className="sidebar">
      <div className="sidebar-logo"><img src="/Logo-Suenos-light.svg" alt="Sueños" /></div>
      <ul className="sidebar-nav">
        {items.map(item => (
          <li key={item.path}>
            <button
              className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
