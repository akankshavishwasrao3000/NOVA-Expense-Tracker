import { useState } from 'react'

export default function ExpenseForm({ onSubmit, loading, initialDate = new Date().toISOString().slice(0, 10) }) {
  const [form, setForm] = useState({
    date: initialDate,
    category: '',
    description: '',
    amount: '',
    payment_mode: '',
  })

  const update = (key) => (event) => { setForm({ ...form, [key]: event.target.value }) }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit({ ...form, amount: Number(form.amount), entry_type: 'Manual' })
  }

  return (
    <section className="panel form-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">QUICK ENTRY</p>
          <h2>Add an expense</h2>
        </div>
        <span className="panel-icon">+</span>
      </div>

      <form className="expense-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Date</span>
          <input required type="date" value={form.date} onChange={update('date')} />
        </label>

        <label className="field">
          <span>Category</span>
          <input required placeholder="Food, Transport..." value={form.category} onChange={update('category')} />
        </label>

        <label className="field wide-field">
          <span>Description</span>
          <input required placeholder="What did you spend on?" value={form.description} onChange={update('description')} />
        </label>

        <label className="field">
          <span>Amount</span>
          <input required min="0.01" step="0.01" type="number" placeholder="0.00" value={form.amount} onChange={update('amount')} />
        </label>

        <label className="field">
          <span>Payment mode</span>
          <select required value={form.payment_mode} onChange={update('payment_mode')}>
            <option value="">Choose one</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="UPI">UPI</option>
            <option value="Net Banking">Net Banking</option>
          </select>
        </label>

        <button type="submit" className="btn primary form-submit" disabled={loading}>
          {loading ? 'Saving...' : 'Add expense'}
        </button>
      </form>
    </section>
  )
}
