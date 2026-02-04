import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

interface Client {
  id: string
  name: string
  phone: string
  email: string | null
  createdAt: string
  lead: { id: string; source: { name: string } | null } | null
  cases: CaseData[]
}

interface CaseData {
  id: string
  status: string
  history: { id: string; previousStatus: string | null; newStatus: string; user: { name: string }; createdAt: string }[]
  calls: { id: string; date: string; duration: number; result: string; observations: string | null; user: { name: string } }[]
}

export default function Clients() {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)

  const canEdit = user!.role === 'admin' || user!.role === 'supervisor'

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      const { data } = await api.get(`/clients${params}`)
      setClients(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchClients() }, [fetchClients])

  const loadDetail = async (id: string) => {
    try {
      const { data } = await api.get(`/clients/${id}`)
      setSelected(data)
    } catch (err) {
      console.error(err)
    }
  }

  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({ name: '', phone: '', email: '' })

  const startEdit = () => {
    if (!selected) return
    setEditMode(true)
    setEditData({ name: selected.name, phone: selected.phone, email: selected.email || '' })
  }

  const saveEdit = async () => {
    if (!selected) return
    try {
      await api.put(`/clients/${selected.id}`, editData)
      setEditMode(false)
      setSelected(prev => prev ? { ...prev, ...editData } : null)
    } catch (err) { console.error(err) }
  }

  // Merge timeline: history + calls sorted by date
  const getTimeline = (caseData: CaseData) => {
    const events: Array<{ type: 'status' | 'call'; date: string; data: any }> = []
    caseData.history.forEach(h => events.push({ type: 'status', date: h.createdAt, data: h }))
    caseData.calls.forEach(c => events.push({ type: 'call', date: c.date, data: c }))
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  return (
    <div>
      {/* Búsqueda */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '400px' }}
          />
        </div>
      </div>

      <div className="dashboard-split">
        {/* Lista */}
        <div className="lead-list">
          <div className="lead-list-header">
            <div className="flex-between">
              <h3>Clientes</h3>
              <span className="text-muted">{clients.length} total</span>
            </div>
          </div>
          {loading && <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>}
          {!loading && clients.length === 0 && <div style={{ padding: '32px 20px', textAlign: 'center', color: '#94a3b8' }}>Sin clientes</div>}
          {!loading && clients.map(c => (
            <div
              key={c.id}
              className={`lead-item ${selected?.id === c.id ? 'selected' : ''}`}
              onClick={() => { loadDetail(c.id); setEditMode(false) }}
            >
              <div className="lead-item-name">{c.name}</div>
              <div className="lead-item-phone">{c.phone}</div>
              <div className="lead-item-footer">
                <span style={{ fontSize: '11px', color: '#64748b' }}>{c.cases.length} caso(s)</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{new Date(c.createdAt).toLocaleDateString('es-ES')}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Detalle con timeline */}
        <div className="detail-panel">
          {!selected ? (
            <div className="empty-state">Selecciona un cliente</div>
          ) : editMode ? (
            <div className="card">
              <h3 className="section-title">Editar Cliente</h3>
              <div className="form-group"><label>Nombre</label><input value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} /></div>
              <div className="form-group"><label>Teléfono</label><input value={editData.phone} onChange={e => setEditData(d => ({ ...d, phone: e.target.value }))} /></div>
              <div className="form-group"><label>Email</label><input value={editData.email} onChange={e => setEditData(d => ({ ...d, email: e.target.value }))} /></div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary btn-sm" onClick={saveEdit}>Guardar</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(false)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <>
              <div className="card">
                <div className="flex-between">
                  <h3 className="section-title" style={{ marginBottom: 0 }}>{selected.name}</h3>
                  {canEdit && <button className="btn btn-secondary btn-sm" onClick={startEdit}>Editar</button>}
                </div>
                <div className="info-grid mt-4">
                  <div className="info-item"><label>Teléfono</label><p>{selected.phone}</p></div>
                  <div className="info-item"><label>Email</label><p>{selected.email || '—'}</p></div>
                  <div className="info-item"><label>Fuente</label><p>{selected.lead?.source?.name || '—'}</p></div>
                  <div className="info-item"><label>Cliente desde</label><p>{new Date(selected.createdAt).toLocaleDateString('es-ES')}</p></div>
                </div>
              </div>

              {/* Casos + Timeline */}
              {selected.cases.map(c => (
                <div key={c.id} className="card">
                  <div className="flex-between">
                    <h3 className="section-title" style={{ marginBottom: 0 }}>Caso</h3>
                    <span className={`badge badge-${c.status}`}>{c.status.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="timeline mt-4">
                    {getTimeline(c).map((event, i) => (
                      <div key={i} className="timeline-item">
                        <div className="timeline-dot" style={{ background: event.type === 'call' ? '#16a34a' : '#2563eb' }} />
                        {i < getTimeline(c).length - 1 && <div className="timeline-line" />}
                        <div className="timeline-content">
                          <div className="time">{new Date(event.date).toLocaleString('es-ES')}</div>
                          <div className="text">
                            {event.type === 'status' ? (
                              <>
                                {event.data.previousStatus ? (
                                  <><span className={`badge badge-${event.data.previousStatus}`} style={{ fontSize: '11px' }}>{event.data.previousStatus.replace(/_/g, ' ')}</span> → <span className={`badge badge-${event.data.newStatus}`} style={{ fontSize: '11px' }}>{event.data.newStatus.replace(/_/g, ' ')}</span></>
                                ) : (
                                  <span className={`badge badge-${event.data.newStatus}`} style={{ fontSize: '11px' }}>Creado: {event.data.newStatus}</span>
                                )}
                                <span style={{ color: '#94a3b8', marginLeft: '8px', fontSize: '12px' }}>({event.data.user.name})</span>
                              </>
                            ) : (
                              <span>Llamada — {event.data.result} ({event.data.duration} min) <span style={{ color: '#94a3b8' }}>({event.data.user.name})</span></span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
