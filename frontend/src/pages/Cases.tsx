import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

interface CaseItem {
  id: string
  status: string
  client: { id: string; name: string; phone: string }
  lead: { assignedUser: { name: string } | null } | null
  history: { id: string; previousStatus: string | null; newStatus: string; createdAt: string; user: { name: string } }[]
  calls: { id: string; date: string; duration: number; result: string; observations: string | null; user: { name: string } }[]
  updatedAt: string
}

const STATUSES = ['nuevo', 'pendiente_llamada', 'contactado', 'no_contesta', 'seguimiento', 'cerrado']
const STATUS_LABELS: Record<string, string> = {
  nuevo: 'Nuevo',
  pendiente_llamada: 'Pendiente Llamada',
  contactado: 'Contactado',
  no_contesta: 'No Contesta',
  seguimiento: 'Seguimiento',
  cerrado: 'Cerrado',
}

export default function Cases() {
  const [cases, setCases] = useState<CaseItem[]>([])
  const [selected, setSelected] = useState<CaseItem | null>(null)
  const [activeTab, setActiveTab] = useState<'pipeline' | 'table'>('pipeline')
  const [loading, setLoading] = useState(true)

  const fetchCases = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/cases')
      setCases(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCases() }, [fetchCases])

  const handleSelect = async (caseId: string) => {
    try {
      const { data } = await api.get(`/cases/${caseId}`)
      setSelected(data)
    } catch (err) { console.error(err) }
  }

  const handleStatusChange = async (caseId: string, newStatus: string) => {
    try {
      await api.put(`/cases/${caseId}/status`, { status: newStatus })
      fetchCases()
      if (selected?.id === caseId) {
        const { data } = await api.get(`/cases/${caseId}`)
        setSelected(data)
      }
    } catch (err) { console.error(err) }
  }

  const [callForm, setCallForm] = useState({ date: new Date().toISOString().split('T')[0], duration: 5, result: 'contestó', observations: '' })

  const submitCall = async (caseId: string, e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/calls', { caseId, ...callForm })
      setCallForm({ date: new Date().toISOString().split('T')[0], duration: 5, result: 'contestó', observations: '' })
      const { data } = await api.get(`/cases/${caseId}`)
      setSelected(data)
      fetchCases()
    } catch (err) { console.error(err) }
  }

  if (loading) return <div className="empty-state">Cargando casos...</div>

  return (
    <div>
      <div className="tabs" style={{ marginBottom: '16px' }}>
        <button className={`tab ${activeTab === 'pipeline' ? 'active' : ''}`} onClick={() => setActiveTab('pipeline')}>Pipeline</button>
        <button className={`tab ${activeTab === 'table' ? 'active' : ''}`} onClick={() => setActiveTab('table')}>Tabla</button>
      </div>

      {activeTab === 'pipeline' && !selected && (
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px' }}>
          {STATUSES.map(status => {
            const statusCases = cases.filter(c => c.status === status)
            return (
              <div key={status} className="pipeline-column">
                <div className="pipeline-header">
                  <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>
                  <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '6px' }}>{statusCases.length}</span>
                </div>
                <div className="pipeline-cards">
                  {statusCases.map(c => (
                    <div key={c.id} className="pipeline-card" onClick={() => handleSelect(c.id)}>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{c.client.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{c.client.phone}</div>
                      {c.lead?.assignedUser && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Asesora: {c.lead.assignedUser.name}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'table' && !selected && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th>Asesora</th>
                  <th>Último cambio</th>
                </tr>
              </thead>
              <tbody>
                {cases.map(c => (
                  <tr key={c.id} onClick={() => handleSelect(c.id)} style={{ cursor: 'pointer' }}>
                    <td><strong>{c.client.name}</strong></td>
                    <td>{c.client.phone}</td>
                    <td><span className={`badge badge-${c.status}`}>{STATUS_LABELS[c.status]}</span></td>
                    <td>{c.lead?.assignedUser?.name || '—'}</td>
                    <td>{new Date(c.updatedAt).toLocaleDateString('es-ES')}</td>
                  </tr>
                ))}
                {cases.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>Sin casos</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detalle del caso seleccionado */}
      {selected && (
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)} style={{ marginBottom: '12px' }}>← Volver</button>
          <div className="card">
            <div className="flex-between">
              <h3 className="section-title" style={{ marginBottom: 0 }}>{selected.client.name}</h3>
              <select value={selected.status} onChange={e => handleStatusChange(selected.id, e.target.value)} style={{ width: 'auto' }}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="info-grid mt-4">
              <div className="info-item"><label>Teléfono</label><p>{selected.client.phone}</p></div>
              <div className="info-item"><label>Asesora</label><p>{selected.lead?.assignedUser?.name || '—'}</p></div>
            </div>
          </div>

          {/* Historial */}
          <div className="card" style={{ marginTop: '12px' }}>
            <h3 className="section-title">Historial de Estado</h3>
            <div className="timeline">
              {selected.history.map((h, i) => (
                <div key={h.id} className="timeline-item">
                  <div className="timeline-dot" />
                  {i < selected.history.length - 1 && <div className="timeline-line" />}
                  <div className="timeline-content">
                    <div className="time">{new Date(h.createdAt).toLocaleString('es-ES')}</div>
                    <div className="text">
                      {h.previousStatus ? (
                        <><span className={`badge badge-${h.previousStatus}`} style={{ fontSize: '11px' }}>{h.previousStatus.replace(/_/g, ' ')}</span> → <span className={`badge badge-${h.newStatus}`} style={{ fontSize: '11px' }}>{h.newStatus.replace(/_/g, ' ')}</span></>
                      ) : (
                        <span className={`badge badge-${h.newStatus}`} style={{ fontSize: '11px' }}>Creado: {h.newStatus}</span>
                      )}
                      <span style={{ color: '#94a3b8', marginLeft: '8px', fontSize: '12px' }}>({h.user.name})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Registrar llamada */}
          <div className="card" style={{ marginTop: '12px' }}>
            <h3 className="section-title">Registrar Llamada</h3>
            <form onSubmit={e => submitCall(selected.id, e)}>
              <div className="grid-2">
                <div className="form-group"><label>Fecha</label><input type="date" value={callForm.date} onChange={e => setCallForm(f => ({ ...f, date: e.target.value }))} required /></div>
                <div className="form-group"><label>Duración (min)</label><input type="number" min={1} value={callForm.duration} onChange={e => setCallForm(f => ({ ...f, duration: parseInt(e.target.value) || 1 }))} required /></div>
              </div>
              <div className="form-group">
                <label>Resultado</label>
                <select value={callForm.result} onChange={e => setCallForm(f => ({ ...f, result: e.target.value }))}>
                  <option value="contestó">Contestó</option>
                  <option value="no contestó">No contestó</option>
                  <option value="buzón">Buzón de mensajes</option>
                  <option value="ocupado">Ocupado</option>
                  <option value="número incorrecto">Número incorrecto</option>
                </select>
              </div>
              <div className="form-group"><label>Observaciones</label><textarea value={callForm.observations} onChange={e => setCallForm(f => ({ ...f, observations: e.target.value }))} placeholder="Notas opcionales..." /></div>
              <button type="submit" className="btn btn-primary btn-sm">Registrar</button>
            </form>
          </div>

          {/* Llamadas registradas */}
          {selected.calls.length > 0 && (
            <div className="card" style={{ marginTop: '12px' }}>
              <h3 className="section-title">Llamadas</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Fecha</th><th>Duración</th><th>Resultado</th><th>Observaciones</th></tr></thead>
                  <tbody>
                    {selected.calls.map(c => (
                      <tr key={c.id}>
                        <td>{new Date(c.date).toLocaleDateString('es-ES')}</td>
                        <td>{c.duration} min</td>
                        <td>{c.result}</td>
                        <td>{c.observations || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
