import React, { useState } from 'react'
import { getErrorMessage } from '@/utils/labels'

interface ReportToolbarProps {
  onDownload: () => Promise<void>
}

export const ReportToolbar: React.FC<ReportToolbarProps> = ({ onDownload }) => {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState('')

  const handleDownload = async () => {
    setIsDownloading(true)
    setError('')
    try {
      await onDownload()
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal mengunduh file'))
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="actions no-print">
      <button className="btn-secondary" onClick={handleDownload} disabled={isDownloading}>
        {isDownloading ? 'Mengunduh...' : 'Unduh Excel'}
      </button>
      <button className="btn-secondary" onClick={() => window.print()}>
        Cetak / PDF
      </button>
      {error && <span className="error">{error}</span>}
    </div>
  )
}
