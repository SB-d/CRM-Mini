import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import Clients from './pages/Clients'
import Cases from './pages/Cases'
import ManualLoad from './pages/ManualLoad'
import Users from './pages/Users'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="empty-state">Cargando...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RoleGuard({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const { user } = useAuth()
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Layout routes — autenticadas */}
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/manual-load" element={<RoleGuard roles={['admin', 'supervisor']}><ManualLoad /></RoleGuard>} />
            <Route path="/users" element={<RoleGuard roles={['admin']}><Users /></RoleGuard>} />
          </Route>

          {/* Rutas antiguas → redirect al dashboard */}
          <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
          <Route path="/asesora" element={<Navigate to="/dashboard" replace />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
