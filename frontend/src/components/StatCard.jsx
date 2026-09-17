import { useEffect, useState } from 'react'

function AnimatedValue({ value }) {
  const text = String(value)
  const numericValue = Number(text.replace(/[^\d.-]/g, ''))
  const prefix = text.includes('₹') ? '₹' : ''
  const decimals = text.includes('.') ? 2 : 0
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!Number.isFinite(numericValue)) return
    let frame
    const started = performance.now()
    const animate = (now) => {
      const progress = Math.min((now - started) / 650, 1)
      const eased = 1 - ((1 - progress) ** 3)
      setCurrent(numericValue * eased)
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [numericValue])

  return `${prefix}${current.toFixed(decimals)}`
}

export default function StatCard({ label, value, note, icon }) {
  return (
    <div className="stat-card reveal-card">
      <span className="stat-icon">{icon}</span>
      <p>{label}</p>
      <strong><AnimatedValue value={value} /></strong>
      <small>{note}</small>
      <span className="stat-spark" aria-hidden="true" />
    </div>
  )
}
