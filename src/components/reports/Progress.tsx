import React from 'react'

// Bar capaian: hijau >= 80%, kuning >= 50%, merah di bawahnya
export const Progress: React.FC<{ percent: number | null; compact?: boolean }> = ({
  percent,
  compact,
}) => {
  if (percent === null) return <span className="muted">-</span>
  const level = percent >= 80 ? 'good' : percent >= 50 ? 'mid' : 'low'
  return (
    <div className={`progress progress-${level}${compact ? ' compact' : ''}`}>
      <div className="progress-bar" style={{ width: `${Math.min(percent, 100)}%` }} />
      <span className="progress-label">{percent.toFixed(percent % 1 ? 1 : 0)}%</span>
    </div>
  )
}
