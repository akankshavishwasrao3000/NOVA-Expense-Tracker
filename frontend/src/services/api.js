const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export async function apiRequest(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
      },
    })
  } catch {
    throw new Error('Unable to connect to the Flask backend')
  }
  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : await response.text()
  if (!response.ok) {
    const fallback = response.status === 503 ? 'Database unavailable' : `Request failed (${response.status})`
    const error = new Error(data?.error || data || fallback)
    error.status = response.status
    throw error
  }
  return data
}

export const api = {
  session: () => apiRequest('/api/auth/session'),
  login: (payload) => apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  signup: (payload) => apiRequest('/api/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),
  dashboard: () => apiRequest('/api/dashboard'),
  expenses: () => apiRequest('/api/expenses'),
  addExpense: (payload) => apiRequest('/api/expenses', { method: 'POST', body: JSON.stringify(payload) }),
  updateExpense: (id, payload) => apiRequest(`/api/expenses/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteExpense: (id) => apiRequest(`/api/expenses/${id}`, { method: 'DELETE' }),
  analytics: (period) => apiRequest(`/api/analytics/${period}`),
  calendar: () => apiRequest('/api/calendar'),
  calendarDay: (date) => apiRequest(`/api/calendar/${date}`),
  chatbot: (message) => apiRequest('/api/chatbot', { method: 'POST', body: JSON.stringify({ message }) }),
  profile: () => apiRequest('/api/profile'),
  uploadProfile: (file) => {
    const body = new FormData()
    body.append('profile_pic', file)
    return apiRequest('/api/profile/picture', { method: 'POST', body })
  },
  aiInsights: (type) => apiRequest(`/api/ai/${type}`),
  generateAi: (type) => apiRequest(`/api/ai/${type}`, { method: 'POST', body: JSON.stringify({ generate: true }) }),
  download: async (path) => {
    const response = await fetch(`${API_URL}${path}`, { credentials: 'include' })
    if (!response.ok) {
      const data = await response.json().catch(() => null)
      throw new Error(data?.error || 'Unable to download report')
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = path.endsWith('pdf') ? 'expense_report.pdf' : 'expense_report.csv'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  },
  assetUrl: (path) => `${API_URL}${path}`,
}
