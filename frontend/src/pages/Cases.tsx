import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

/* ── Interfaces ── */
interface CaseItem {
  id: string
  status: string
  client: { id: string; name: string; phone: string }
  lead: { assignedUser: { name: string } | null } | null
  history: { id: string; previousStatus: string | null; newStatus: string; createdAt: string; user: { name: string } }[]
  calls: { id: string; date: string; duration: number; result: string; observations: string | null; user: { name: string } }[]
  updatedAt: string
}

interface CaseNote {
  id: string
  caseId: string
  userId: string
  role: string
  managementType: string
  content: string
  statusSnapshot: string
  nextFollowUpDate: string | null
  createdAt: string
  updatedAt: string
  annulledAt: string | null
  user: { name: string }
}

/* ── Constants ── */
const STATUSES = ['nuevo', 'pendiente_llamada', 'contactado', 'no_contesta', 'seguimiento', 'cerrado']
const STATUS_LABELS: Record<string, string> = {
  nuevo: 'Nuevo',
  pendiente_llamada: 'Pendiente Llamada',
  contactado: 'Contactado',
  no_contesta: 'No Contesta',
  seguimiento: 'Seguimiento',
  cerrado: 'Cerrado',
}

const MGMT_TYPES = [
  'llamada_realizada',
  'no_contesta',
  'numero_equivocado',
  'cliente_interesado',
  'cliente_no_interesado',
  'reagendar',
  'seguimiento',
  'cierre_de_caso',
  'observacion_interna',
]

const MGMT_LABELS: Record<string, string> = {
  llamada_realizada: 'Llamada realizada',
  no_contesta: 'No contesta',
  numero_equivocado: 'Número equivocado',
  cliente_interesado: 'Cliente interesado',
  cliente_no_interesado: 'Cliente no interesado',
  reagendar: 'Reagendar',
  seguimiento: 'Seguimiento',
  cierre_de_caso: 'Cierre de caso',
  observacion_interna: 'Observación interna',
}

const MGMT_COLORS: Record<string, string> = {
  llamada_realizada: '#2563eb',
  no_contesta: '#dc2626',
  numero_equivocado: '#ea580c',
  cliente_interesado: '#16a34a',
  cliente_no_interesado: '#9333ea',
  reagendar: '#d97706',
  seguimiento: '#0891b2',
  cierre_de_caso: '#374151',
  observacion_interna: '#64748b',
}

/* ── Avatar helpers ── */
function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  const colors = ['#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#0891b2', '#d97706', '#db2777']
  return colors[Math.abs(h) % colors.length]
}

function avatarInitials(name: string): string {
  return name
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/* ── Permission helpers ── */
function canEditNote(note: CaseNote, userId: string, role: string): boolean {
  if (note.annulledAt) return false
  if (role === 'admin') return true
  if (role === 'supervisor') return note.role !== 'admin'
  // asesora: own notes within 10 min
  if (note.userId !== userId) return false
  const elapsed = Date.now() - new Date(note.createdAt).getTime()
  return elapsed <= 10 * 60 * 1000
}

function canAnnulNote(note: CaseNote, role: string): boolean {
  if (note.annulledAt) return false
  if (role === 'admin') return true
  if (role === 'supervisor') return note.role === 'asesora'
  return false
}

/* ── Component ── */
export default function Cases() {
  const { user } = useAuth()
  const [cases, setCases] = useState<CaseItem[]>([])
  const [selected, setSelected] = useState<CaseItem | null>(null)
  const [activeTab, setActiveTab] = useState<'pipeline' | 'table'>('pipeline')
  const [loading, setLoading] = useState(true)

  // Notes state
  const [notes, setNotes] = useState<CaseNote[]>([])
  const [detailTab, setDetailTab] = useState<'detalle' | 'historial'>('detalle')
  const [noteForm, setNoteForm] = useState({ managementType: 'llamada_realizada', content: '', nextFollowUpDate: '' })
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ managementType: '', content: '', nextFollowUpDate: '' })

  /* ── Fetchers ── */
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

  const fetchNotes = useCallback(async (caseId: string) => {
    try {
      const { data } = await api.get(`/cases/${caseId}/notes`)
      setNotes(data)
    } catch (err) { console.error(err) }
  }, [])

  const handleSelect = async (caseId: string) => {
    try {
      const [{ data: caseData }, { data: notesData }] = await Promise.all([
        api.get(`/cases/${caseId}`),
        api.get(`/cases/${caseId}/notes`),
      ])
      setSelected(caseData)
      setNotes(notesData)
      setDetailTab('detalle')
      setEditingNoteId(null)
    } catch (err) { console.error(err) }
  }

  /* ── Status change ── */
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

  /* ── Call form ── */
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

  /* ── Notes CRUD ── */
  const submitNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !noteForm.content.trim()) return
    try {
      await api.post(`/cases/${selected.id}/notes`, {
        managementType: noteForm.managementType,
        content: noteForm.content,
        ...(noteForm.nextFollowUpDate && { nextFollowUpDate: noteForm.nextFollowUpDate }),
      })
      setNoteForm({ managementType: 'llamada_realizada', content: '', nextFollowUpDate: '' })
      await fetchNotes(selected.id)
      // Si fue cierre_de_caso, refrescar el caso
      if (noteForm.managementType === 'cierre_de_caso') {
        const { data } = await api.get(`/cases/${selected.id}`)
        setSelected(data)
        fetchCases()
      }
    } catch (err) { console.error(err) }
  }

  const startEditNote = (note: CaseNote) => {
    setEditingNoteId(note.id)
    setEditForm({
      managementType: note.managementType,
      content: note.content,
      nextFollowUpDate: note.nextFollowUpDate ? note.nextFollowUpDate.split('T')[0] : '',
    })
  }

  const saveEditNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingNoteId || !selected) return
    try {
      await api.patch(`/notes/${editingNoteId}`, {
        content: editForm.content,
        managementType: editForm.managementType,
        ...(editForm.nextFollowUpDate !== undefined && { nextFollowUpDate: editForm.nextFollowUpDate || null }),
      })
      setEditingNoteId(null)
      await fetchNotes(selected.id)
    } catch (err) { console.error(err) }
  }

  const annulNote = async (noteId: string) => {
    if (!selected) return
    try {
      await api.patch(`/notes/${noteId}/annul`)
      await fetchNotes(selected.id)
    } catch (err) { console.error(err) }
  }

  /* ── Render ── */
  if (loading) return <div className="empty-state">Cargando casos...</div>

  return (
    <div>
      <div className="tabs" style={{ marginBottom: '16px' }}>
        <button className={`tab ${activeTab === 'pipeline' ? 'active' : ''}`} onClick={() => setActiveTab('pipeline')}>Pipeline</button>
        <button className={`tab ${activeTab === 'table' ? 'active' : ''}`} onClick={() => setActiveTab('table')}>Tabla</button>
      </div>

      {/* Pipeline */}
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

      {/* Tabla */}
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

          {/* Header del caso */}
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

          {/* Tabs: Detalle | Historial / Bitácora */}
          <div className="tabs" style={{ marginTop: '12px', marginBottom: '0' }}>
            <button className={`tab ${detailTab === 'detalle' ? 'active' : ''}`} onClick={() => setDetailTab('detalle')}>Detalle</button>
            <button className={`tab ${detailTab === 'historial' ? 'active' : ''}`} onClick={() => setDetailTab('historial')}>Historial / Bitácora</button>
          </div>

          {/* ── Tab: Detalle ── */}
          {detailTab === 'detalle' && (
            <div>
              {/* Historial de Estado */}
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

          {/* ── Tab: Historial / Bitácora ── */}
          {detailTab === 'historial' && (
            <div className="notes-layout">
              {/* Chat de notas */}
              <div className="notes-chat">
                {notes.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 20px', fontSize: '14px' }}>
                    Sin notas aún. Agrega la primera nota abajo.
                  </div>
                )}
                {notes.map(note => {
                  const isEditing = editingNoteId === note.id
                  return (
                    <div key={note.id} className={`note-item ${note.annulledAt ? 'note-annulled' : ''}`}>
                      <div className="note-avatar" style={{ background: avatarColor(note.user.name) }}>
                        {avatarInitials(note.user.name)}
                      </div>
                      <div className="note-body">
                        <div className="note-header">
                          <span style={{ fontWeight: 600, fontSize: '14px' }}>{note.user.name}</span>
                          <span className="badge" style={{
                            fontSize: '10px',
                            padding: '2px 7px',
                            background: note.role === 'admin' ? '#dbeafe' : note.role === 'supervisor' ? '#fef3c7' : '#ede9fe',
                            color: note.role === 'admin' ? '#1d4ed8' : note.role === 'supervisor' ? '#d97706' : '#7c3aed',
                            marginLeft: '6px',
                          }}>{note.role}</span>
                          <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '8px' }}>
                            {new Date(note.createdAt).toLocaleString('es-ES')}
                          </span>
                          {note.annulledAt && <span style={{ color: '#dc2626', fontSize: '11px', fontWeight: 600, marginLeft: '8px' }}>ANULADA</span>}
                        </div>

                        {/* Badges: tipo de gestión + snapshot */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span className="badge" style={{
                            fontSize: '11px',
                            background: MGMT_COLORS[note.managementType] + '18',
                            color: MGMT_COLORS[note.managementType],
                          }}>{MGMT_LABELS[note.managementType]}</span>
                          <span className={`badge badge-${note.statusSnapshot}`} style={{ fontSize: '10px' }}>Estado: {STATUS_LABELS[note.statusSnapshot] || note.statusSnapshot}</span>
                        </div>

                        {/* Contenido o formulario de edición */}
                        {isEditing ? (
                          <form onSubmit={saveEditNote} style={{ marginTop: '8px' }}>
                            <div style={{ marginBottom: '6px' }}>
                              <select value={editForm.managementType} onChange={e => setEditForm(f => ({ ...f, managementType: e.target.value }))} style={{ width: '100%' }}>
                                {MGMT_TYPES.map(t => <option key={t} value={t}>{MGMT_LABELS[t]}</option>)}
                              </select>
                            </div>
                            {editForm.managementType === 'reagendar' && (
                              <div style={{ marginBottom: '6px' }}>
                                <input type="date" value={editForm.nextFollowUpDate} onChange={e => setEditForm(f => ({ ...f, nextFollowUpDate: e.target.value }))} required />
                              </div>
                            )}
                            <textarea value={editForm.content} onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))} style={{ width: '100%', minHeight: '50px' }} required />
                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                              <button type="submit" className="btn btn-primary btn-sm">Guardar</button>
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingNoteId(null)}>Cancelar</button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <p style={{ marginTop: '6px', fontSize: '14px', color: '#374151', lineHeight: 1.5 }}>{note.content}</p>
                            {note.nextFollowUpDate && (
                              <p style={{ fontSize: '12px', color: '#0891b2', marginTop: '4px' }}>
                                Próximo seguimiento: {new Date(note.nextFollowUpDate).toLocaleDateString('es-ES')}
                              </p>
                            )}
                          </>
                        )}

                        {/* Acciones */}
                        {!isEditing && !note.annulledAt && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            {canEditNote(note, user!.id, user!.role) && (
                              <button className="btn btn-secondary btn-sm" onClick={() => startEditNote(note)}>Editar</button>
                            )}
                            {canAnnulNote(note, user!.role) && (
                              <button className="btn btn-danger btn-sm" onClick={() => annulNote(note.id)}>Anular</button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Input box fijo abajo */}
              <form onSubmit={submitNote} className="notes-input-box">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: '0 0 auto' }}>
                    <select value={noteForm.managementType} onChange={e => setNoteForm(f => ({ ...f, managementType: e.target.value, nextFollowUpDate: '' }))} style={{ width: 'auto', minWidth: '180px' }}>
                      {MGMT_TYPES.map(t => <option key={t} value={t}>{MGMT_LABELS[t]}</option>)}
                    </select>
                  </div>
                  {noteForm.managementType === 'reagendar' && (
                    <div style={{ flex: '0 0 auto' }}>
                      <input type="date" value={noteForm.nextFollowUpDate} onChange={e => setNoteForm(f => ({ ...f, nextFollowUpDate: e.target.value }))} required style={{ width: 'auto' }} />
                    </div>
                  )}
                  <textarea
                    value={noteForm.content}
                    onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))}
                    placeholder="Escribe una nota..."
                    style={{ flex: 1, minWidth: '200px', minHeight: '48px', resize: 'vertical' }}
                    required
                  />
                  <button type="submit" className="btn btn-primary btn-sm" style={{ flex: '0 0 auto', height: '38px' }}>Enviar</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
