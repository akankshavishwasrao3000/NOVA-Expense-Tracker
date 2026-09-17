export default function Sidebar({ page, onNavigate, user, onLogout, open }) {
  const nav = [
    ['dashboard', 'Dashboard'],
    ['weekly', 'Weekly Records'],
    ['monthly', 'Monthly Records'],
    ['yearly', 'Yearly Records'],
    ['history', 'History'],
    ['calendar', 'Expense Calendar'],
    ['profile', 'Profile'],
  ]

  const aiNav = [
    ['financial', 'Financial Report'],
    ['budget', 'Budget Planner'],
    ['savings', 'Savings Plan'],
    ['spending', 'Spending Insights'],
  ]

  const icons = ['⌂', '↗', '▥', '▤', '≡', '□', '○']

  return (
    <aside className={open ? 'sidebar open' : 'sidebar'}>
      <button type="button" className="brand-block brand-link" onClick={() => onNavigate('dashboard')} aria-label="Open NOVA Expense Tracker dashboard">
        <div className="brand-mark">N</div>
        <div>
          <strong>NOVA</strong>
          <span>Expense Tracker</span>
        </div>
      </button>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {nav.map(([id, label], index) => (
          <button
            key={id}
            type="button"
            className={page === id ? 'nav-item active' : 'nav-item'}
            onClick={() => onNavigate(id)}
          >
            <span className="nav-icon" aria-hidden="true">{icons[index]}</span>
            {label}
          </button>
        ))}
      </nav>

      <div className="nav-divider">
        <span className="nav-section-label">AI INSIGHTS</span>
        {aiNav.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={page === id ? 'nav-item active' : 'nav-item'}
            onClick={() => onNavigate(id)}
          >
            <span className="nav-icon" aria-hidden="true">✦</span>
            {label}
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="user-preview">
          <span>{user?.username?.slice(0, 1).toUpperCase() || 'U'}</span>
          <div>
            <strong>{user?.username || 'User'}</strong>
            <small>Personal account</small>
          </div>
        </div>
        <button type="button" className="logout-button" onClick={onLogout}>
          <span aria-hidden="true">↪</span> Log out
        </button>
      </div>
    </aside>
  )
}
