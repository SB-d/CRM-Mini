import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import Header from '../../components/Header'

interface Lead {
  id: string
  name: string
  phone: string
  email: string | null
  status: string
  assignedUser: { name: string } | null
  source: { name: string } | null
  createdAt: string
}

interface Distribution {
  id: string
  name: string
  isActive: boolean
  totalLeads: number
  activeLeads: number
}

interface User {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [distribution, setDistribution] = useState<Distribution[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [activeTab, setActiveTab] = useState<'leads' | 'asesoras' | 'metricas'>('leads')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [leadsRes, distRes, usersRes] = await Promise.all([
        api.get('/leads'),
        api.get('/leads/distribution'),
        api.get('/users'),
      ])
      setLeads(leadsRes.data)
      setDistribution(distRes.data)
      setUsers(usersRes.data)
    } catch (err) {
      console.error('Error cargando datos:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleUser = async (id: string, isActive: boolean) => {
    try {
      await api.put(`/users/${id}/toggle`, { isActive })
      await fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div className="empty-state">Cargando dashboard...</div>

  const asesoras = users.filter((u) => u.role === 'asesora')
  const activeLeads = leads.filter((l) => l.status !== 'cerrado')

  return (
    <div className="app">
      <Header userName={user!.name} userRole={user!.role} onLogout={logout} />
      <div className="main">
        {/* Stats */}
        <div className="grid-4">
          <div className="card stat-card">
            <div className="stat-icon" style={{ background: '#dbeafe' }}>📥</div>
            <div>
              <div className="stat-value">{leads.length}</div>
              <div className="stat-label">Total Leads</div>
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon" style={{ background: '#d1fae5' }}>✅</div>
            <div>
              <div className="stat-value">{activeLeads.length}</div>
              <div className="stat-label">Leads Activos</div>
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon" style={{ background: '#ede9fe' }}>👥</div>
            <div>
              <div className="stat-value">{asesoras.filter((a) => a.isActive).length}</div>
              <div className="stat-label">Asesoras Activas</div>
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon" style={{ background: '#fef3c7' }}>📊</div>
            <div>
              <div className="stat-value">{distribution.reduce((s, d) => s + d.activeLeads, 0)}</div>
              <div className="stat-label">Casos en Proceso</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs mt-4">
          <button className={`tab ${activeTab === 'leads' ? 'active' : ''}`} onClick={() => setActiveTab('leads')}>Leads</button>
          <button className={`tab ${activeTab === 'asesoras' ? 'active' : ''}`} onClick={() => setActiveTab('asesoras')}>Asesoras</button>
          <button className={`tab ${activeTab === 'metricas' ? 'active' : ''}`} onClick={() => setActiveTab('metricas')}>Métricas</button>
        </div>

        {/* Tab: Leads */}
        {activeTab === 'leads' && (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th>Fuente</th>
                    <th>Estado</th>
                    <th>Asesora</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id}>
                      <td><strong>{lead.name}</strong></td>
                      <td>{lead.phone}</td>
                      <td>{lead.email || '—'}</td>
                      <td>{lead.source?.name || '—'}</td>
                      <td><span className={`badge badge-${lead.status}`}>{lead.status.replace(/_/g, ' ')}</span></td>
                      <td>{lead.assignedUser?.name || 'Sin asignar'}</td>
                      <td>{new Date(lead.createdAt).toLocaleDateString('es-ES')}</td>
                    </tr>
                  ))}
                  {leads.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>Sin leads</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Asesoras */}
        {activeTab === 'asesoras' && (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {asesoras.map((a) => (
                    <tr key={a.id}>
                      <td><strong>{a.name}</strong></td>
                      <td>{a.email}</td>
                      <td><span className={`badge ${a.isActive ? 'badge-activa' : 'badge-inactiva'}`}>{a.isActive ? 'Activa' : 'Inactiva'}</span></td>
                      <td>
                        <button
                          className={`btn btn-sm ${a.isActive ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => toggleUser(a.id, !a.isActive)}
                        >
                          {a.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Métricas */}
        {activeTab === 'metricas' && (
          <div className="card">
            <h3 className="section-title">Distribución de Leads por Asesora</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Asesora</th>
                    <th>Estado</th>
                    <th>Total</th>
                    <th>Activos</th>
                    <th>Proporción</th>
                  </tr>
                </thead>
                <tbody>
                  {distribution.map((d) => {
                    const total = distribution.reduce((s, x) => s + x.totalLeads, 0)
                    const pct = total > 0 ? ((d.totalLeads / total) * 100).toFixed(1) : '0'
                    return (
                      <tr key={d.id}>
                        <td><strong>{d.name}</strong></td>
                        <td><span className={`badge ${d.isActive ? 'badge-activa' : 'badge-inactiva'}`}>{d.isActive ? 'Activa' : 'Inactiva'}</span></td>
                        <td>{d.totalLeads}</td>
                        <td>{d.activeLeads}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '80px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: '#2563eb', borderRadius: '3px' }} />
                            </div>
                            <span style={{ fontSize: '13px', color: '#64748b' }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {distribution.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>Sin datos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
