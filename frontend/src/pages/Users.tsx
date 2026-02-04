import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

interface UserItem {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
}

export default function Users() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'asesora' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [editData, setEditData] = useState({ role: 'asesora', isActive: true, password: '' })

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/users')
      setUsers(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  /* ── Crear ── */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await api.post('/users', form)
      setForm({ email: '', password: '', name: '', role: 'asesora' })
      setShowForm(false)
      fetchUsers()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear usuario')
    }
  }

  /* ── Editar ── */
  const startEdit = (u: UserItem) => {
    setEditingUser(u)
    setEditData({ role: u.role, isActive: u.isActive, password: '' })
    setError(null)
    setShowForm(false)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setError(null)
    try {
      const body: { role: string; isActive: boolean; password?: string } = { role: editData.role, isActive: editData.isActive }
      if (editData.password) body.password = editData.password
      await api.put(`/users/${editingUser.id}`, body)
      setEditingUser(null)
      fetchUsers()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar usuario')
    }
  }

  /* ── Toggle rápido ── */
  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await api.put(`/users/${id}/toggle`, { isActive: !isActive })
      fetchUsers()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div className="empty-state">Cargando usuarios...</div>

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Usuarios</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setEditingUser(null); setError(null) }}>
          {showForm ? 'Cancelar' : '+ Nuevo usuario'}
        </button>
      </div>

      {/* Formulario crear */}
      {showForm && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 className="section-title">Crear usuario</h3>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleCreate}>
            <div className="grid-2">
              <div className="form-group">
                <label>Nombre</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Rol</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="asesora">Asesora</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Crear</button>
          </form>
        </div>
      )}

      {/* Formulario editar */}
      {editingUser && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="flex-between" style={{ marginBottom: '12px' }}>
            <h3 className="section-title" style={{ marginBottom: 0 }}>Editar: {editingUser.name} <span style={{ color: '#64748b', fontWeight: 400, fontSize: '13px' }}>{editingUser.email}</span></h3>
            <button className="btn btn-secondary btn-sm" onClick={() => { setEditingUser(null); setError(null) }}>Cancelar</button>
          </div>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleEdit}>
            <div className="grid-2">
              <div className="form-group">
                <label>Rol</label>
                <select value={editData.role} onChange={e => setEditData(d => ({ ...d, role: e.target.value }))}>
                  <option value="asesora">Asesora</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select value={editData.isActive ? 'true' : 'false'} onChange={e => setEditData(d => ({ ...d, isActive: e.target.value === 'true' }))}>
                  <option value="true">Activa</option>
                  <option value="false">Inactiva</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Nueva contraseña <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcional — deja vacío para no cambiar)</span></label>
                <input type="password" value={editData.password} onChange={e => setEditData(d => ({ ...d, password: e.target.value }))} placeholder="Nueva contraseña..." />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Guardar cambios</button>
          </form>
        </div>
      )}

      {/* Tabla */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ background: editingUser?.id === u.id ? '#eff6ff' : undefined }}>
                  <td><strong>{u.name}</strong></td>
                  <td style={{ color: '#64748b' }}>{u.email}</td>
                  <td>
                    <span className={`badge badge-${u.role === 'admin' ? 'contactado' : u.role === 'supervisor' ? 'seguimiento' : 'nuevo'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.isActive ? 'badge-activa' : 'badge-inactiva'}`}>
                      {u.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => startEdit(u)}>Editar</button>
                    <button
                      className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => handleToggle(u.id, u.isActive)}
                    >
                      {u.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>Sin usuarios</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
