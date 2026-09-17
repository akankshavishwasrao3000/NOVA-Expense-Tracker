const money = (value) => `₹${Number(value || 0).toFixed(2)}`

export default function ExpenseTable({ expenses, onDelete }) {
  return (
    <section className="panel table-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">ACTIVITY</p>
          <h2>Recent expenses</h2>
        </div>
        <span className="count-badge">{expenses.length} entries</span>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Type</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length ? (
              expenses.map((item) => (
                <tr key={item.id}>
                  <td>{item.date}</td>
                  <td><span className="category-dot" />{item.category}</td>
                  <td className="description-cell">{item.description}</td>
                  <td className="amount">{money(item.amount)}</td>
                  <td>{item.payment_mode}</td>
                  <td><span className="tag">{item.entry_type}</span></td>
                  <td>
                    <button type="button" className="icon-button danger" title="Delete expense" onClick={() => onDelete(item.id)}>
                      ×
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="empty">No expenses yet. Add your first one above.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
