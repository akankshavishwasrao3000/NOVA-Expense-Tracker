import { useState } from 'react'
import ExpenseForm from '../components/ExpenseForm'
import ExpenseTable from '../components/ExpenseTable'
import StatCard from '../components/StatCard'
import { api } from '../services/api'

const money = (value) => `₹${Number(value || 0).toFixed(2)}`

export default function Dashboard({ data, onRefresh, onNotice }) {
  const [saving, setSaving] = useState(false)

  const handleAddExpense = async (payload) => {
    setSaving(true)
    try {
      await api.addExpense(payload)
      onNotice('Expense added successfully')
      await onRefresh()
    } catch (error) {
      onNotice(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return
    try {
      await api.deleteExpense(id)
      onNotice('Expense deleted')
      await onRefresh()
    } catch (error) {
      onNotice(error.message)
    }
  }

  return (
    <div className="page">
      <div className="page-title">
        <p className="eyebrow">{new Date().getHours() < 12 ? 'GOOD MORNING' : new Date().getHours() < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING'}</p>
        <h1>Welcome back, {data.user.username} <span className="wave" aria-hidden="true">👋</span></h1>
        <p className="page-subtitle">Here&apos;s your financial snapshot for today.</p>
      </div>

      <div className="summary-cards">
        <StatCard label="Total expenses" value={money(data.total_expenses)} note="All time" icon="↗" />
        <StatCard label="This month" value={money(data.monthly_expenses)} note="Current month" icon="◷" />
        <StatCard label="Transactions" value={data.total_transactions} note="Total entries" icon="#" />
      </div>

      <div className="action-row">
        <button type="button" className="btn success" onClick={() => api.download('/export-csv').catch((error) => onNotice(error.message))}>↓ Download CSV</button>
        <button type="button" className="btn outline" onClick={() => api.download('/export-pdf').catch((error) => onNotice(error.message))}>↓ Download PDF</button>
      </div>

      <ExpenseForm onSubmit={handleAddExpense} loading={saving} />
      <ExpenseTable expenses={data.expenses || []} onDelete={handleDeleteExpense} />
    </div>
  )
}
