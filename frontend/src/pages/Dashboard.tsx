import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

interface Metrics {
  period: string
  totalLeads: number
  conversions: number
  conversionPct: number
  leadsByStatus: Record<string, number>
  productivity: Array<{
    id: string
    name: string
    isActive: boolean
    leadsAssigned: number
    casesWorked: number
    callsRegistered: number
    activeCases: number
  }>
}

const STATUSES = ['nuevo', 'pendiente_llamada', 'contactado', 'no_contesta', 'seguimiento', 'cerrado']

export default function Dashboard() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month')
  const [loading, setLoading] = useState(true)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    try {
      if (user!.role === 'admin' || user!.role === 'supervisor') {
        const { data } = await api.get(`/dashboard/metrics?period=${period}`)
        setMetrics(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [period, user])

  useEffect(() => { fetchMetrics() }, [fetchMetrics])

  if (user!.role === 'asesora') {
    return (
      <div className="empty-state">
        <div>
          <p style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>Bienvenida, {user!.name}</p>
          <p style={{ marginTop: '8px' }}>Usa el sidebar para navegar a tus Leads o Casos</p>
        </div>
      </div>
    )
  }

  if (loading || !metrics) return <div className="empty-state">Cargando métricas...</div>

  const maxCases = Math.max(...metrics.productivity.map(p => p.casesWorked), 1)

  return (
    <div>
      {/* Period selector */}
      <div className="flex" style={{ gap: '8px', marginBottom: '20px' }}>
        {(['day', 'week', 'month'] as const).map(p => (
          <button key={p} className={`tab ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
            {p === 'day' ? 'Hoy' : p === 'week' ? 'Semana' : 'Mes'}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid-4">
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe' }}>📥</div>
          <div>
            <div className="stat-value">{metrics.totalLeads}</div>
            <div className="stat-label">Leads Recibidos</div>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: '#d1fae5' }}>✅</div>
          <div>
            <div className="stat-value">{metrics.conversions}</div>
            <div className="stat-label">Conversiones</div>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: '#ede9fe' }}>📈</div>
          <div>
            <div className="stat-value">{metrics.conversionPct}%</div>
            <div className="stat-label">Tasa Conversión</div>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7' }}>🎯</div>
          <div>
            <div className="stat-value">{metrics.productivity.reduce((s, p) => s + p.activeCases, 0)}</div>
            <div className="stat-label">Casos Activos</div>
          </div>
        </div>
      </div>

      <div className="grid-2 mt-4">
        {/* Leads por estado */}
        <div className="card">
          <h3 className="section-title">Leads por Estado</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {STATUSES.map(status => {
              const count = metrics.leadsByStatus[status] || 0
              const total = metrics.totalLeads || 1
              const pct = (count / total) * 100
              return (
                <div key={status}>
                  <div className="flex-between" style={{ marginBottom: '4px' }}>
                    <span className={`badge badge-${status}`}>{status.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{count}</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#2563eb', borderRadius: '3px', transition: 'width 0.3s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Productividad ranking */}
        <div className="card">
          <h3 className="section-title">Productividad por Asesora</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>Leads</th>
                  <th>Casos</th>
                  <th>Llamadas</th>
                  <th>Activos</th>
                </tr>
              </thead>
              <tbody>
                {metrics.productivity.map((p, i) => (
                  <tr key={p.id}>
                    <td><strong style={{ color: i < 3 ? '#2563eb' : '#64748b' }}>#{i + 1}</strong></td>
                    <td>
                      <strong>{p.name}</strong>
                      {!p.isActive && <span className="badge badge-inactiva" style={{ marginLeft: '6px', fontSize: '10px' }}>Inactiva</span>}
                    </td>
                    <td>{p.leadsAssigned}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {p.casesWorked}
                        <div style={{ width: '60px', height: '5px', background: '#e2e8f0', borderRadius: '3px' }}>
                          <div style={{ width: `${(p.casesWorked / maxCases) * 100}%`, height: '100%', background: '#16a34a', borderRadius: '3px' }} />
                        </div>
                      </div>
                    </td>
                    <td>{p.callsRegistered}</td>
                    <td>{p.activeCases}</td>
                  </tr>
                ))}
                {metrics.productivity.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>Sin datos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
