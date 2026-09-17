import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import ExpenseTable from '../components/ExpenseTable'

export default function History({ onNotice }) {
  const [expenses, setExpenses] = useState([])
  const [filters, setFilters] = useState({ date: '', category: '', min: '', max: '' })

  useEffect(() => {
    api.expenses()
      .then((data) => setExpenses(data.expenses || []))
      .catch((error) => onNotice(error.message))
  }, [onNotice])

  const filtered = useMemo(() => {
    return expenses.filter((item) => {
      const matchesDate = !filters.date || item.date === filters.date
      const matchesCategory = !filters.category || item.category.toLowerCase().includes(filters.category.toLowerCase())
      const matchesMin = !filters.min || Number(item.amount) >= Number(filters.min)
      const matchesMax = !filters.max || Number(item.amount) <= Number(filters.max)
      return matchesDate && matchesCategory && matchesMin && matchesMax
    })
  }, [expenses, filters])

  return (
    <div className="page">
      <div className="page-title">
        <p className="eyebrow">ALL ACTIVITY</p>
        <h1>Expense history</h1>
      </div>

      <section className="panel">
        <div className="filter-grid">
          <label className="field">
            <span>Date</span>
            <input type="date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} />
          </label>

          <label className="field">
            <span>Category</span>
            <input placeholder="Any category" value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })} />
          </label>

          <label className="field">
            <span>Minimum</span>
            <input type="number" value={filters.min} onChange={(event) => setFilters({ ...filters, min: event.target.value })} />
          </label>

          <label className="field">
            <span>Maximum</span>
            <input type="number" value={filters.max} onChange={(event) => setFilters({ ...filters, max: event.target.value })} />
          </label>
        </div>
      </section>

      <ExpenseTable expenses={filtered} onDelete={() => {}} />
    </div>
  )
}
