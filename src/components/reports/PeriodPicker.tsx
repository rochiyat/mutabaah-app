import React from 'react'
import { PRESET_LABELS, PeriodPreset, detectPreset, presetRange } from '@/utils/period'

interface PeriodPickerProps {
  start: string
  end: string
  onChange: (period: { start: string; end: string }) => void
}

export const PeriodPicker: React.FC<PeriodPickerProps> = ({ start, end, onChange }) => {
  const preset = detectPreset(start, end)

  return (
    <div className="period-picker no-print">
      <div className="segmented">
        {(Object.keys(PRESET_LABELS) as PeriodPreset[]).map((p) => (
          <button
            key={p}
            type="button"
            className={preset === p ? 'selected' : ''}
            onClick={() => {
              if (p !== 'custom') onChange(presetRange(p))
            }}
            disabled={p === 'custom'}
            title={p === 'custom' ? 'Ubah tanggal di samping' : undefined}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
      </div>
      <label>
        Dari{' '}
        <input
          type="date"
          value={start}
          max={end}
          onChange={(e) => e.target.value && onChange({ start: e.target.value, end })}
        />
      </label>
      <label>
        s.d.{' '}
        <input
          type="date"
          value={end}
          min={start}
          onChange={(e) => e.target.value && onChange({ start, end: e.target.value })}
        />
      </label>
    </div>
  )
}
