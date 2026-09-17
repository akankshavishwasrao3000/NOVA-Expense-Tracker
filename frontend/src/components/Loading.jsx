export default function Loading({ error = '', onRetry }) {
  if (error) {
    return (
      <div className="loading">
        <p className="alert error" role="alert">{error}</p>
        {onRetry && <button type="button" className="btn outline" onClick={onRetry}>Try again</button>}
      </div>
    )
  }

  return <div className="loading">Loading...</div>
}
