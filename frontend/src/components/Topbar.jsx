export default function Topbar({ page, user, onMenuToggle, mobileOpen }) {
  const label = page === 'dashboard' ? 'Dashboard' : page.replace('-', ' ')

  return (
    <header className="topbar">
      <button type="button" className="menu-toggle" onClick={onMenuToggle} aria-label="Toggle menu">
        {mobileOpen ? '×' : '☰'}
      </button>
      <div className="topbar-context">
        <span className="topbar-kicker">Workspace</span>
        <span className="topbar-label">Personal finance / <strong>{label}</strong></span>
      </div>
      <div className="user-chip">
        <span>{user?.username?.slice(0, 1).toUpperCase() || 'U'}</span>
        <div><strong>{user?.username || 'User'}</strong><small>Account</small></div>
      </div>
    </header>
  )
}
