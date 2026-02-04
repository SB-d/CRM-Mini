import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import Header from '../../components/Header'

// ─── Types ──────────────────────────────────────────────────
interface Lead {
  id: string
  name: string
  phone: string
  email: string | null
  status: string
  source: { name: string } | null
  client: { id: string } | null
  createdAt: string
}

interface HistoryEntry {
  id: string
  previousStatus: string | null
  newStatus: string
  user: { name: string }
  createdAt: string
}

interface CallEntry {
  id: string
  date: string
  duration: number
  result: string
  observations: string | null
  user: { name: string }
  createdAt: string
}

interface CaseDetail {
  id: string
  status: string
  history: HistoryEntry[]
  calls: CallEntry[]
}

interface ClientDetail {
  id: string
  name: string
  cases: CaseDetail[]
}

const CASE_STATUSES = ['nuevo', 'pendiente_llamada', 'contactado', 'no_contesta', 'seguimiento', 'cerrado']

// ─── Component ──────────────────────────────────────────────
export default function AsesoraDashboard() {
  const { user, logout } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [clientDetail, setClientDetail] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const [callForm, setCallForm] = useState({
    date: new Date().toISOString().split('T')[0],
    duration: 5,
    result: 'contestó',
    observations: '',
  })

  const fetchLeads = useCallback(async () => {
    try {
      const { data } = await api.get('/leads')
      setLeads(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const loadClientDetail = async (clientId: string) => {
    try {
      const { data } = await api.get(`/clients/${clientId}`)
      setClientDetail(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead)
    setClientDetail(null)
    if (lead.client) loadClientDetail(lead.client.id)
  }

  // Convertir lead → cliente
  const handleConvert = async () => {
    if (!selectedLead) return
    try {
      await api.post(`/clients/convert/${selectedLead.id}`)
      // Refetch leads para ver el cliente asociado
      const { data } = await api.get('/leads')
      setLeads(data)
      const updated = data.find((l: Lead) => l.id === selectedLead.id)
      if (updated) {
        setSelectedLead(updated)
        if (updated.client) loadClientDetail(updated.client.id)
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al convertir')
    }
  }

  // Cambiar estado del caso
  const handleStatusChange = async (caseId: string, newStatus: string) => {
    try {
      await api.put(`/cases/${caseId}/status`, { status: newStatus })
      if (clientDetail) loadClientDetail(clientDetail.id)
    } catch (err) {
      console.error(err)
    }
  }

  // Registrar llamada
  const handleCallSubmit = async (caseId: string, e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/calls', { caseId, ...callForm })
      setCallForm({ date: new Date().toISOString().split('T')[0], duration: 5, result: 'contestó', observations: '' })
      if (clientDetail) loadClientDetail(clientDetail.id)
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div className="empty-state">Cargando...</div>

  const currentCase = clientDetail?.cases?.[0] ?? null

  return (
    <div className="app">
      <Header userName={user!.name} userRole={user!.role} onLogout={logout} />
      <div className="main">
        <div className="dashboard-split">
          {/* ── Lista de mis leads ── */}
          <div className="lead-list">
            <div className="lead-list-header">
              <h3>Mis Leads</h3>
              <span className="text-muted">{leads.length} total</span>
            </div>
            {leads.length === 0 && (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: '#94a3b8' }}>
                No tienes leads asignados
              </div>
            )}
            {leads.map((lead) => (
              <div
                key={lead.id}
                className={`lead-item ${selectedLead?.id === lead.id ? 'selected' : ''}`}
                onClick={() => handleLeadClick(lead)}
              >
                <div className="lead-item-name">{lead.name}</div>
                <div className="lead-item-phone">{lead.phone}</div>
                <div className="lead-item-footer">
                  <span className={`badge badge-${lead.status}`}>{lead.status.replace(/_/g, ' ')}</span>
                  {lead.client && <span style={{ fontSize: '11px', color: '#047857', fontWeight: 600 }}>Cliente ✓</span>}
                </div>
              </div>
            ))}
          </div>

          {/* ── Panel de detalle ── */}
          <div className="detail-panel">
            {!selectedLead ? (
              <div className="empty-state">Selecciona un lead de la lista</div>
            ) : (
              <>
                {/* Info del lead */}
                <div className="card">
                  <div className="flex-between">
                    <h3 className="section-title" style={{ marginBottom: 0 }}>{selectedLead.name}</h3>
                    <span className={`badge badge-${selectedLead.status}`}>{selectedLead.status.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="info-grid mt-4">
                    <div className="info-item">
                      <label>Teléfono</label>
                      <p>{selectedLead.phone}</p>
                    </div>
                    <div className="info-item">
                      <label>Email</label>
                      <p>{selectedLead.email || '—'}</p>
                    </div>
                    <div className="info-item">
                      <label>Fuente</label>
                      <p>{selectedLead.source?.name || '—'}</p>
                    </div>
                    <div className="info-item">
                      <label>Fecha entrada</label>
                      <p>{new Date(selectedLead.createdAt).toLocaleDateString('es-ES')}</p>
                    </div>
                  </div>
                  {!selectedLead.client && (
                    <button className="btn btn-primary mt-4" onClick={handleConvert}>
                      Convertir a Cliente
                    </button>
                  )}
                </div>

                {/* Caso — solo si tiene cliente */}
                {currentCase && (
                  <>
                    {/* Cambio de estado */}
                    <div className="card">
                      <h3 className="section-title">Estado del Caso</h3>
                      <select
                        value={currentCase.status}
                        onChange={(e) => handleStatusChange(currentCase.id, e.target.value)}
                        style={{ width: '100%' }}
                      >
                        {CASE_STATUSES.map((s) => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </div>

                    {/* Historial de estados */}
                    <div className="card">
                      <h3 className="section-title">Historial de Estado</h3>
                      <div className="timeline">
                        {currentCase.history.map((h, i) => (
                          <div key={h.id} className="timeline-item">
                            <div className="timeline-dot" />
                            {i < currentCase.history.length - 1 && <div className="timeline-line" />}
                            <div className="timeline-content">
                              <div className="time">{new Date(h.createdAt).toLocaleString('es-ES')}</div>
                              <div className="text">
                                {h.previousStatus ? (
                                  <>
                                    <span className={`badge badge-${h.previousStatus}`} style={{ fontSize: '11px' }}>{h.previousStatus.replace(/_/g, ' ')}</span>
                                    {' → '}
                                    <span className={`badge badge-${h.newStatus}`} style={{ fontSize: '11px' }}>{h.newStatus.replace(/_/g, ' ')}</span>
                                  </>
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

                    {/* Formulario de llamada */}
                    <div className="card">
                      <h3 className="section-title">Registrar Llamada</h3>
                      <form onSubmit={(e) => handleCallSubmit(currentCase.id, e)}>
                        <div className="grid-2">
                          <div className="form-group">
                            <label>Fecha</label>
                            <input
                              type="date"
                              value={callForm.date}
                              onChange={(e) => setCallForm({ ...callForm, date: e.target.value })}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Duración (min)</label>
                            <input
                              type="number"
                              min={1}
                              value={callForm.duration}
                              onChange={(e) => setCallForm({ ...callForm, duration: parseInt(e.target.value) || 1 })}
                              required
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Resultado</label>
                          <select value={callForm.result} onChange={(e) => setCallForm({ ...callForm, result: e.target.value })}>
                            <option value="contestó">Contestó</option>
                            <option value="no contestó">No contestó</option>
                            <option value="buzón">Buzón de mensajes</option>
                            <option value="ocupado">Ocupado</option>
                            <option value="número incorrecto">Número incorrecto</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Observaciones</label>
                          <textarea
                            value={callForm.observations}
                            onChange={(e) => setCallForm({ ...callForm, observations: e.target.value })}
                            placeholder="Notas opcionales..."
                          />
                        </div>
                        <button type="submit" className="btn btn-primary">Registrar Llamada</button>
                      </form>
                    </div>

                    {/* Historial de llamadas */}
                    {currentCase.calls.length > 0 && (
                      <div className="card">
                        <h3 className="section-title">Llamadas Registradas</h3>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Fecha</th>
                                <th>Duración</th>
                                <th>Resultado</th>
                                <th>Observaciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentCase.calls.map((c) => (
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
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
