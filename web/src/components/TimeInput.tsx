interface Props {
  value: string // "HH:MM"
  onChange: (value: string) => void
}

const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

export default function TimeInput({ value, onChange }: Props) {
  const [h, m] = value ? value.split(':') : ['', '']

  function update(newH: string, newM: string) {
    if (newH && newM) onChange(`${newH}:${newM}`)
    else if (newH) onChange(`${newH}:${m || '00'}`)
    else onChange('')
  }

  return (
    <div style={{ display: 'flex', gap: '0.4rem' }}>
      <select
        value={h || ''}
        onChange={e => update(e.target.value, m || '00')}
        style={selectStyle}
      >
        <option value="">HH</option>
        {hours.map(hh => <option key={hh} value={hh}>{hh}</option>)}
      </select>
      <span style={{ color: 'var(--fg-muted)', alignSelf: 'center', fontWeight: 600 }}>:</span>
      <select
        value={m || ''}
        onChange={e => update(h || '00', e.target.value)}
        style={selectStyle}
      >
        <option value="">MM</option>
        {minutes.map(mm => <option key={mm} value={mm}>{mm}</option>)}
      </select>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  flex: 1, boxSizing: 'border-box',
  border: '1px solid var(--border)', borderRadius: 7,
  padding: '8px 6px', fontSize: '0.88rem',
  background: 'var(--bg)', color: 'var(--fg)',
  outline: 'none', cursor: 'pointer',
}
