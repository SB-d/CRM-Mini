import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

interface Lead {
  id: string
  name: string
  phone: string
  email: string | null
  status: string
  observations: string | null
  createdManually: boolean
  assignedUser: { name: string } | null
  source: { id: string; name: string } | null
  client: { id: string } | null
  createdAt: string
}

interface Source { id: string; name: string }
interface User { id: string; name: string; role: string }

const STATUSES = ['nuevo', 'pendiente_llamada', 'contactado', 'no_contesta', 'seguimiento', 'cerrado']

export default function Leads() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [sources, setSources] = useState<Source[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selected, setSelected] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState({
    status: '',
    sourceId: '',
    assignedUserId: '',
    from: '',
    to: '',
  })

  const LIMIT = 20
  const canEdit = user!.role === 'admin' || user!.role === 'supervisor'

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
      if (filters.status) params.set('status', filters.status)
      if (filters.sourceId) params.set('sourceId', filters.sourceId)
      if (filters.assignedUserId) params.set('assignedUserId', filters.assignedUserId)
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)

      const { data } = await api.get(`/leads?${params}`)
      setLeads(data.data)
      setTotal(data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => {
    api.get('/leads/sources').then(r => setSources(r.data)).catch(() => {})
    if (canEdit) api.get('/users').then(r => setUsers(r.data)).catch(() => {})
  }, [canEdit])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const handleConvert = async (leadId: string) => {
    try {
      await api.post(`/clients/convert/${leadId}`)
      fetchLeads()
      setSelected(null)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al convertir')
    }
  }

  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({ name: '', phone: '', email: '', observations: '' })

  const startEdit = (lead: Lead) => {
    setEditMode(true)
    setEditData({ name: lead.name, phone: lead.phone, email: lead.email || '', observations: lead.observations || '' })
  }

  const saveEdit = async () => {
    if (!selected) return
    try {
      await api.put(`/leads/${selected.id}`, editData)
      setEditMode(false)
      fetchLeads()
      setSelected(prev => prev ? { ...prev, ...editData } : null)
    } catch (err) {
      console.error(err)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)
  const asesoras = users.filter(u => u.role === 'asesora')

  return (
    <div>
      {/* Filtros */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Estado</label>
            <select value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1) }}>
              <option value="">Todos</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Fuente</label>
            <select value={filters.sourceId} onChange={e => { setFilters(f => ({ ...f, sourceId: e.target.value })); setPage(1) }}>
              <option value="">Todas</option>
              {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {canEdit && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Asesora</label>
              <select value={filters.assignedUserId} onChange={e => { setFilters(f => ({ ...f, assignedUserId: e.target.value })); setPage(1) }}>
                <option value="">Todas</option>
                {asesoras.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Desde</label>
            <input type="date" value={filters.from} onChange={e => { setFilters(f => ({ ...f, from: e.target.value })); setPage(1) }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Hasta</label>
            <input type="date" value={filters.to} onChange={e => { setFilters(f => ({ ...f, to: e.target.value })); setPage(1) }} />
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => { setFilters({ status: '', sourceId: '', assignedUserId: '', from: '', to: '' }); setPage(1) }}>
            Limpiar
          </button>
        </div>
      </div>

      <div className="dashboard-split">
        {/* Lista */}
        <div className="lead-list">
          <div className="lead-list-header">
            <div className="flex-between">
              <h3>Leads</h3>
              <span className="text-muted">{total} total</span>
            </div>
          </div>

          {loading && <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>}

          {!loading && leads.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#94a3b8' }}>Sin leads</div>
          )}

          {!loading && leads.map(lead => (
            <div
              key={lead.id}
              className={`lead-item ${selected?.id === lead.id ? 'selected' : ''}`}
              onClick={() => { setSelected(lead); setEditMode(false) }}
            >
              <div className="lead-item-name">{lead.name}</div>
              <div className="lead-item-phone">{lead.phone}</div>
              <div className="lead-item-footer">
                <span className={`badge badge-${lead.status}`}>{lead.status.replace(/_/g, ' ')}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {lead.createdManually && <span style={{ fontSize: '10px', color: '#7c3aed', fontWeight: 600 }}>Manual</span>}
                  {lead.client && <span style={{ fontSize: '10px', color: '#047857', fontWeight: 600 }}>Cliente</span>}
                </div>
              </div>
            </div>
          ))}

          {/* Paginación */}
          {totalPages > 1 && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center', gap: '4px' }}>
              <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce((acc: (number | string)[], p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) => typeof p === 'string'
                  ? <span key={`e${i}`} style={{ padding: '4px 8px' }}>...</span>
                  : <button key={p} className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPage(p)}>{p}</button>
                )}
              <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          )}
        </div>

        {/* Detalle */}
        <div className="detail-panel">
          {!selected ? (
            <div className="empty-state">Selecciona un lead</div>
          ) : editMode ? (
            <div className="card">
              <h3 className="section-title">Editar Lead</h3>
              <div className="form-group"><label>Nombre</label><input value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} /></div>
              <div className="form-group"><label>Teléfono</label><input value={editData.phone} onChange={e => setEditData(d => ({ ...d, phone: e.target.value }))} /></div>
              <div className="form-group"><label>Email</label><input value={editData.email} onChange={e => setEditData(d => ({ ...d, email: e.target.value }))} /></div>
              <div className="form-group"><label>Observaciones</label><textarea value={editData.observations} onChange={e => setEditData(d => ({ ...d, observations: e.target.value }))} /></div>
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
                  <span className={`badge badge-${selected.status}`}>{selected.status.replace(/_/g, ' ')}</span>
                </div>
                <div className="info-grid mt-4">
                  <div className="info-item"><label>Teléfono</label><p>{selected.phone}</p></div>
                  <div className="info-item"><label>Email</label><p>{selected.email || '—'}</p></div>
                  <div className="info-item"><label>Fuente</label><p>{selected.source?.name || '—'}</p></div>
                  <div className="info-item"><label>Asesora</label><p>{selected.assignedUser?.name || 'Sin asignar'}</p></div>
                  <div className="info-item"><label>Entrada</label><p>{new Date(selected.createdAt).toLocaleDateString('es-ES')}</p></div>
                  <div className="info-item"><label>Origen</label><p>{selected.createdManually ? 'Manual' : 'Automático'}</p></div>
                </div>
                {selected.observations && (
                  <div style={{ marginTop: '12px', padding: '10px', background: '#f8fafc', borderRadius: '6px', fontSize: '13px', color: '#475569' }}>
                    <strong>Observaciones:</strong> {selected.observations}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  {canEdit && <button className="btn btn-secondary btn-sm" onClick={() => startEdit(selected)}>Editar</button>}
                  {!selected.client && <button className="btn btn-primary btn-sm" onClick={() => handleConvert(selected.id)}>Convertir a Cliente</button>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
