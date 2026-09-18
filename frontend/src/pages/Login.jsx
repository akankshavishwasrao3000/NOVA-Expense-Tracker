import { useState } from 'react'

export default function Login({ initialValues, onSubmit, error, loading, onToggleMode }) {
  const [values, setValues] = useState(initialValues)

  const update = (key) => (event) => setValues({ ...values, [key]: event.target.value })

  return (
    <main className="auth-page auth-login">
      <section className="auth-card">
        <p className="eyebrow">NOVA / EXPENSE TRACKER</p>
        <h1>Welcome back</h1>
        <p className="muted">Your spending, clearly in view.</p>

        {error && <div className={error.startsWith('Account created') ? 'alert success' : 'alert error'} role="alert">{error}</div>}

        <form
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(values)
          }}
        >
          <label className="field">
            <span>Email</span>
            <input required type="email" value={values.email} onChange={update('email')} />
          </label>

          <label className="field">
            <span>Password</span>
            <input required type="password" value={values.password} onChange={update('password')} />
          </label>

          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Please wait...' : 'Log in'}
          </button>
        </form>

        <p className="switch-auth">
          Don&apos;t have an account?{' '}
          <button type="button" onClick={() => onToggleMode('signup')}>Sign up</button>
        </p>
      </section>
    </main>
  )
}
