import { useEffect, useState } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'

const money = (value) => `₹${Number(value || 0).toFixed(2)}`

function Chart({ title, data, max }) {
  return (
    <section className="panel chart-panel">
      <div className="section-heading">
        <h2>{title}</h2>
        <span className="chart-total">{money(data.reduce((sum, [, value]) => sum + value, 0))}</span>
      </div>

      {data.length ? (
        <div className="bars">
          {data.map(([label, value]) => (
            <div className="bar-wrap" key={label}>
              <div className="bar-value">{money(value)}</div>
              <div className="bar" style={{ height: `${Math.max(5, (value / max) * 170)}px` }} />
              <small>{label}</small>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">No data for this period.</div>
      )}
    </section>
  )
}

export default function Analytics({ period, onNotice }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.analytics(period)
      .then(setData)
      .catch((requestError) => {
        setError(requestError.message)
        onNotice(requestError.message)
      })
  }, [period, onNotice])

  if (!data) {
    return (
      <div className="page">
        <p className="eyebrow">ANALYTICS</p>
        <Loading error={error} onRetry={() => window.location.reload()} />
      </div>
    )
  }

  const timelineEntries = Object.entries(data.timeline || {})
  const categoryEntries = Object.entries(data.categories || {})
  const timelineMax = Math.max(...timelineEntries.map(([, value]) => value), 1)
  const categoryMax = Math.max(...categoryEntries.map(([, value]) => value), 1)

  return (
    <div className="page">
      <div className="page-title">
        <p className="eyebrow">ANALYTICS</p>
        <h1>{period[0].toUpperCase() + period.slice(1)} records</h1>
      </div>

      <div className="chart-grid">
        <Chart
          title={period === 'weekly' ? 'Daily expenses' : period === 'monthly' ? 'Weekly comparison' : 'Monthly spending'}
          data={timelineEntries}
          max={timelineMax}
        />
        <Chart title="Category breakdown" data={categoryEntries} max={categoryMax} />
      </div>
    </div>
  )
}
