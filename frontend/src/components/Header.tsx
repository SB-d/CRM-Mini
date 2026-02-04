export default function Header({ userName, userRole, onLogout }: { userName: string; userRole: string; onLogout: () => void }) {
  return (
    <header className="header">
      <div className="header-right" style={{ marginLeft: 'auto' }}>
        <div className="header-user">
          {userName}
          <span className="role-badge">{userRole}</span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </header>
  )
}
