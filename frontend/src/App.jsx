import { useCallback, useEffect, useState } from 'react'
import { api } from './services/api'
import Loading from './components/Loading'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import History from './pages/History'
import Calendar from './pages/Calendar'
import Profile from './pages/Profile'
import AiPage from './pages/AiPage'
import Chatbot from './components/Chatbot'

const aiNav = ['financial', 'budget', 'savings', 'spending']

export default function App() {
  const [auth, setAuth] = useState(null)
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(() => window.location.hash.replace('#', '') || 'dashboard')
  const [dashboard, setDashboard] = useState(null)
  const [dashboardError, setDashboardError] = useState('')
  const [toast, setToast] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  const notice = useCallback((message) => {
    const type = /error|unable|could not|invalid|required|failed|unavailable/i.test(message) ? 'error' : 'success'
    setToast({ message, type })
  }, [])

  useEffect(() => {
    api.session()
      .then((data) => setAuth(data.authenticated ? data.user : false))
      .catch(() => setAuth(false))
  }, [])

  useEffect(() => {
    if (auth) {
      api.dashboard()
        .then(setDashboard)
        .catch((error) => {
          setDashboardError(error.message)
          notice(error.message)
        })
    }
  }, [auth, notice])

  useEffect(() => {
    window.location.hash = page
  }, [page])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  const submitAuth = async (values) => {
    setLoading(true)
    setError('')

    try {
      if (mode === 'signup') {
        await api.signup(values)
        setMode('login')
        setError('Account created. Please log in.')
      } else {
        const result = await api.login(values)
        setAuth(result.user)
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await api.logout()
    } catch (error) {
      notice(error.message)
    } finally {
      setAuth(false)
      setDashboard(null)
      setDashboardError('')
    }
  }

  const refreshDashboard = async () => {
    setDashboardError('')
    try {
      const data = await api.dashboard()
      setDashboard(data)
    } catch (error) {
      setDashboardError(error.message)
      notice(error.message)
    }
  }

  if (auth === null) return <Loading />

  if (!auth) {
    return mode === 'login' ? (
      <Login onSubmit={submitAuth} error={error} loading={loading} onToggleMode={setMode} />
    ) : (
      <Signup onSubmit={submitAuth} error={error} loading={loading} onToggleMode={setMode} />
    )
  }

  let content
  if (dashboard && page === 'dashboard') {
    content = <Dashboard data={dashboard} onRefresh={refreshDashboard} onNotice={notice} />
  } else if (page === 'history') {
    content = <History onNotice={notice} />
  } else if (['weekly', 'monthly', 'yearly'].includes(page)) {
    content = <Analytics period={page} onNotice={notice} />
  } else if (page === 'calendar') {
    content = <Calendar onNotice={notice} />
  } else if (page === 'profile') {
    content = <Profile onNotice={notice} />
  } else if (aiNav.includes(page)) {
    content = <AiPage type={page} onNotice={notice} />
  } else if (dashboard) {
    content = <Dashboard data={dashboard} onRefresh={refreshDashboard} onNotice={notice} />
  } else {
    content = <Loading error={dashboardError} onRetry={refreshDashboard} />
  }

  return (
    <div className="app-shell">
      <div className={mobileOpen ? 'sidebar-overlay open' : 'sidebar-overlay'} onClick={() => setMobileOpen(false)} />
      <Sidebar page={page} user={auth} open={mobileOpen} onNavigate={(nextPage) => { setPage(nextPage); setMobileOpen(false) }} onLogout={logout} />

      <main className="main-content">
        <Topbar page={page} user={auth} onMenuToggle={() => setMobileOpen((value) => !value)} mobileOpen={mobileOpen} />
        <div key={page} className="page-transition">{content}</div>
      </main>

      <Chatbot notice={notice} onRefresh={refreshDashboard} />
      {toast && <div className={`toast ${toast.type}`} role="status">{toast.message}</div>}
    </div>
  )
}
