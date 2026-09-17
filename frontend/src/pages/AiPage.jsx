import { useEffect, useState } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'
import StatCard from '../components/StatCard'

const money = (value) => `₹${Number(value || 0).toFixed(2)}`

const pageTitles = {
  financial: 'Financial Report',
  budget: 'Budget Planner',
  savings: 'Savings Plan',
  spending: 'Spending Insights',
}

export default function AiPage({ type, onNotice }) {
  const [insights, setInsights] = useState(null)
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [insightsError, setInsightsError] = useState('')

  useEffect(() => {
    api.aiInsights(type)
      .then((data) => setInsights(data.insights || null))
      .catch((error) => {
        setInsightsError(error.message)
        onNotice(error.message)
      })
  }, [type, onNotice])

  const generate = async () => {
    setLoading(true)
    try {
      const data = await api.generateAi(type)
      setResponse(data.response || 'The AI service returned an empty analysis.')
    } catch (error) {
      setResponse(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (insightsError) {
    return (
      <div className="page">
        <div className="alert error" role="alert">{insightsError}</div>
      </div>
    )
  }

  if (!insights) return <div className="page"><Loading error={insightsError} onRetry={() => window.location.reload()} /></div>

  const categoryBreakdown = Object.entries(insights.category_breakdown || {})
  const frequentExpenses = insights.frequent_expenses || []

  return (
    <div className="page">
      <div className="page-title">
        <p className="eyebrow">NOVA AI</p>
        <h1>{pageTitles[type] || 'AI Insights'}</h1>
      </div>

      <section className="ai-header">
        <div>
          <h2>Personalized analysis</h2>
          <p className="muted">Based on your current month spending.</p>
        </div>

        <button type="button" className="btn primary" disabled={loading} onClick={generate}>
          {loading ? 'Generating...' : 'Generate analysis'}
        </button>
      </section>

      <div className="summary-cards compact">
        <StatCard label="Total spending" value={money(insights.total_spent)} note="This month" icon="↗" />
        <StatCard label="Transactions" value={insights.transaction_count} note="This month" icon="#" />
        <StatCard label="Top category" value={insights.top_categories?.[0]?.name || '-'} note="Highest spend" icon="✦" />
      </div>

      <div className="ai-details-grid">
        <section className="panel ai-data-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">BREAKDOWN</p>
              <h2>Category spending</h2>
            </div>
            <span className="count-badge">{insights.month || 'Current month'}</span>
          </div>
          {categoryBreakdown.length ? (
            <div className="ai-breakdown-list">
              {categoryBreakdown.map(([category, amount]) => (
                <div className="ai-breakdown-row" key={category}>
                  <span>{category}</span>
                  <strong>{money(amount)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">No expenses recorded this month.</p>
          )}
        </section>

        <section className="panel ai-data-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PATTERNS</p>
              <h2>Frequent expenses</h2>
            </div>
            <span className="count-badge">Top 5</span>
          </div>
          {frequentExpenses.length ? (
            <div className="ai-keyword-list">
              {frequentExpenses.map(({ keyword, count }) => (
                <div className="ai-keyword-row" key={keyword}>
                  <span>{keyword}</span>
                  <strong>{count} {count === 1 ? 'time' : 'times'}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">No repeated expense descriptions found.</p>
          )}
        </section>
      </div>

      <section className="panel ai-result">
        {response ? (
          <div className="response-container" dangerouslySetInnerHTML={{ __html: response }} />
        ) : (
          <p className="empty">Generate an analysis to get tailored guidance from Nova.</p>
        )}
      </section>
    </div>
  )
}
