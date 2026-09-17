import { useEffect, useState } from 'react'
import { api } from '../services/api'

const money = (value) => `₹${Number(value || 0).toFixed(2)}`

export default function Calendar({ onNotice }) {
  const [events, setEvents] = useState([])
  const [monthDate, setMonthDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedExpenses, setSelectedExpenses] = useState([])

  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay()
  const totalDays = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()

  useEffect(() => {
    api.calendar()
      .then(setEvents)
      .catch((error) => onNotice(error.message))
  }, [onNotice])

  const eventMap = Object.fromEntries(events.map((event) => [event.date, event.amount]))

  const pickDay = async (day) => {
    const date = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    try {
      const expenses = await api.calendarDay(date)
      setSelectedDate(date)
      setSelectedExpenses(expenses)
    } catch (error) {
      onNotice(error.message)
    }
  }

  const changeMonth = (offset) => {
    setMonthDate((currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1))
    setSelectedDate(null)
    setSelectedExpenses([])
  }

  return (
    <div className="page">
      <div className="page-title">
        <p className="eyebrow">PATTERNS</p>
        <h1>Expense calendar</h1>
      </div>

      <section className="panel calendar-panel">
        <div className="calendar-head">
          <div className="calendar-month-controls">
            <button type="button" className="calendar-nav" onClick={() => changeMonth(-1)} aria-label="Show previous month" title="Previous month">‹</button>
            <h2>{monthDate.toLocaleString('en', { month: 'long', year: 'numeric' })}</h2>
            <button type="button" className="calendar-nav" onClick={() => changeMonth(1)} aria-label="Show next month" title="Next month">›</button>
          </div>
        </div>

        <div className="calendar-grid weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <b key={day}>{day}</b>
          ))}
        </div>

        <div className="calendar-grid">
          {Array.from({ length: firstDay }).map((_, index) => (
            <span key={`blank-${index}`} />
          ))}

          {Array.from({ length: totalDays }, (_, index) => {
            const day = index + 1
            const date = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const amount = eventMap[date]

            return (
              <button
                key={date}
                type="button"
                className={`${amount ? (amount > 2000 ? 'heat high' : amount >= 100 ? 'heat medium' : 'heat low') : ''}${selectedDate === date ? ' selected' : ''}`}
                aria-label={`${date}${amount ? `, ${money(amount)} spent` : ', no expenses'}`}
                onClick={() => pickDay(day)}
              >
                <span>{day}</span>
                {amount && <small>{money(amount)}</small>}
              </button>
            )
          })}
        </div>

        <div className="calendar-legend" aria-label="Expense intensity legend">
          <span><i className="legend-dot low" />Low</span>
          <span><i className="legend-dot medium" />Medium</span>
          <span><i className="legend-dot high" />High</span>
        </div>
      </section>

      {selectedDate && (
        <div className="modal-backdrop" onClick={() => setSelectedDate(null)}>
          <section className="modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setSelectedDate(null)}>×</button>
            <p className="eyebrow">DAY DETAILS</p>
            <h2>{selectedDate}</h2>

            {selectedExpenses.length ? (
              selectedExpenses.map((item, index) => (
                <div className="detail-row" key={`${item.description}-${index}`}>
                  <span>{item.description}</span>
                  <strong>{money(item.amount)}</strong>
                </div>
              ))
            ) : (
              <p className="empty">No expenses for this date.</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
