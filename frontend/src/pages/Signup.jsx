import { useState } from 'react'

export default function Signup({ onSubmit, error, loading, onToggleMode }) {
  const [values, setValues] = useState({ username: '', email: '', password: '' })

  const update = (key) => (event) => setValues({ ...values, [key]: event.target.value })

  return (
    <main className="auth-page auth-signup">
      <section className="auth-card">
        <p className="eyebrow">NOVA / EXPENSE TRACKER</p>
        <h1>Create your account</h1>
        <p className="muted">Start seeing where your money goes.</p>

        {error && <div className="alert error">{error}</div>}

        <form
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(values)
          }}
        >
          <label className="field">
            <span>Username</span>
            <input required value={values.username} onChange={update('username')} />
          </label>

          <label className="field">
            <span>Email</span>
            <input required type="email" value={values.email} onChange={update('email')} />
          </label>

          <label className="field">
            <span>Password</span>
            <input required type="password" value={values.password} onChange={update('password')} />
          </label>

          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Please wait...' : 'Create account'}
          </button>
        </form>

        <p className="switch-auth">
          Already have an account? <button type="button" onClick={() => onToggleMode('login')}>Log in</button>
        </p>
      </section>
    </main>
  )
}
