import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-content">
        <Header userName={user!.name} userRole={user!.role} onLogout={logout} />
        <main className="main"><Outlet /></main>
      </div>
    </div>
  )
}
