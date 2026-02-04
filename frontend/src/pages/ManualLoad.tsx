import { useState } from 'react'
import api from '../services/api'

interface PreviewRow {
  name: string
  phone: string
  email?: string
  observations?: string
  source: string
}

export default function ManualLoad() {
  const [tab, setTab] = useState<'single' | 'bulk'>('single')
  const [form, setForm] = useState({ name: '', phone: '', email: '', observations: '', source: 'Manual' })
  const [singleMsg, setSingleMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  // Bulk
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [bulkResult, setBulkResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null)

  /* ── Individual ── */
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSingleMsg(null)
    try {
      await api.post('/manual-load', {
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        observations: form.observations || undefined,
        source: form.source,
      })
      setSingleMsg({ ok: true, text: 'Lead creado exitosamente' })
      setForm({ name: '', phone: '', email: '', observations: '', source: 'Manual' })
    } catch (err: any) {
      setSingleMsg({ ok: false, text: err.response?.data?.message || 'Error al crear lead' })
    } finally {
      setLoading(false)
    }
  }

  /* ── CSV parsing ── */
  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = (ev.target?.result as string).trim()
      const lines = text.split('\n')
      if (lines.length < 2) return

      const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-záéíóúñ\s]/g, ''))
      const idx = (names: string[]) => {
        for (const n of names) {
          const i = header.indexOf(n)
          if (i >= 0) return i
        }
        return -1
      }

      const nameIdx = idx(['nombre', 'name'])
      const phoneIdx = idx(['telefono', 'phone', 'tel'])
      const emailIdx = idx(['email', 'correo'])
      const obsIdx = idx(['observaciones', 'observations', 'obs'])
      const sourceIdx = idx(['fuente', 'source'])

      const rows: PreviewRow[] = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim())
        if (!cols[nameIdx] && !cols[phoneIdx]) continue
        rows.push({
          name: nameIdx >= 0 ? cols[nameIdx] || '' : '',
          phone: phoneIdx >= 0 ? cols[phoneIdx] || '' : '',
          email: emailIdx >= 0 && cols[emailIdx] ? cols[emailIdx] : undefined,
          observations: obsIdx >= 0 && cols[obsIdx] ? cols[obsIdx] : undefined,
          source: sourceIdx >= 0 && cols[sourceIdx] ? cols[sourceIdx] : 'CSV',
        })
      }
      setPreview(rows)
      setBulkResult(null)
    }
    reader.readAsText(file)
  }

  const handleBulkSubmit = async () => {
    setLoading(true)
    setBulkResult(null)
    try {
      const { data } = await api.post('/manual-load/bulk', { items: preview })
      setBulkResult(data)
      setPreview([])
    } catch (err: any) {
      setBulkResult({ created: 0, skipped: 0, errors: [err.response?.data?.message || 'Error en carga masiva'] })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="tabs" style={{ marginBottom: '16px' }}>
        <button className={`tab ${tab === 'single' ? 'active' : ''}`} onClick={() => setTab('single')}>Individual</button>
        <button className={`tab ${tab === 'bulk' ? 'active' : ''}`} onClick={() => setTab('bulk')}>Masivo (CSV)</button>
      </div>

      {/* ── Tab Individual ── */}
      {tab === 'single' && (
        <div className="card">
          <h3 className="section-title">Crear Lead Manualmente</h3>
          {singleMsg && (
            <div style={{ padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px', background: singleMsg.ok ? '#d1fae5' : '#fee2e2', color: singleMsg.ok ? '#047857' : '#dc2626' }}>
              {singleMsg.text}
            </div>
          )}
          <form onSubmit={handleSingleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label>Nombre *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Teléfono *</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Fuente</label>
                <input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="Ej: Referido, Web, ..." />
              </div>
            </div>
            <div className="form-group">
              <label>Observaciones</label>
              <textarea value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} placeholder="Notas opcionales..." />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>{loading ? 'Creando...' : 'Crear Lead'}</button>
          </form>
        </div>
      )}

      {/* ── Tab Masivo ── */}
      {tab === 'bulk' && (
        <div>
          <div className="card">
            <h3 className="section-title">Carga Masiva desde CSV</h3>
            <p className="text-muted" style={{ marginBottom: '12px' }}>
              El archivo debe tener columnas: <strong>nombre</strong>, <strong>telefono</strong>, y opcionalmente <em>email</em>, <em>observaciones</em>, <em>fuente</em>.
            </p>
            <input type="file" accept=".csv" onChange={handleCSV} />
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="card" style={{ marginTop: '12px' }}>
              <div className="flex-between" style={{ marginBottom: '12px' }}>
                <h3 className="section-title" style={{ marginBottom: 0 }}>Vista previa ({preview.length} registros)</h3>
                <button className="btn btn-primary btn-sm" onClick={handleBulkSubmit} disabled={loading}>
                  {loading ? 'Cargando...' : 'Cargar todos'}
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nombre</th>
                      <th>Teléfono</th>
                      <th>Email</th>
                      <th>Fuente</th>
                      <th>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i}>
                        <td style={{ color: '#94a3b8' }}>{i + 1}</td>
                        <td><strong>{row.name}</strong></td>
                        <td>{row.phone}</td>
                        <td>{row.email || '—'}</td>
                        <td>{row.source}</td>
                        <td>{row.observations || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Resultado bulk */}
          {bulkResult && (
            <div className="card" style={{ marginTop: '12px' }}>
              <h3 className="section-title">Resultado</h3>
              <div style={{ display: 'flex', gap: '16px', marginBottom: bulkResult.errors.length ? '12px' : 0 }}>
                <div style={{ padding: '10px 18px', borderRadius: '8px', background: '#d1fae5', color: '#047857' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700 }}>{bulkResult.created}</div>
                  <div style={{ fontSize: '12px' }}>Creados</div>
                </div>
                <div style={{ padding: '10px 18px', borderRadius: '8px', background: '#fef3c7', color: '#d97706' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700 }}>{bulkResult.skipped}</div>
                  <div style={{ fontSize: '12px' }}>Omitidos</div>
                </div>
              </div>
              {bulkResult.errors.length > 0 && (
                <div style={{ background: '#fee2e2', borderRadius: '6px', padding: '10px 14px' }}>
                  <div style={{ fontWeight: 600, color: '#dc2626', fontSize: '13px', marginBottom: '6px' }}>Errores:</div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#dc2626' }}>
                    {bulkResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
