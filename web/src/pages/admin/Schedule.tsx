import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import TimeInput from '../../components/TimeInput'

type Frequency = 'once' | 'daily' | 'weekly' | 'monthly'

const FREQ_RULES: Record<Frequency, string | null> = {
  once:    null,
  daily:   'FREQ=DAILY',
  weekly:  'FREQ=WEEKLY',
  monthly: 'FREQ=MONTHLY',
}

function ruleToFreq(rule: string | null): Frequency {
  if (!rule) return 'once'
  if (rule.includes('DAILY')) return 'daily'
  if (rule.includes('WEEKLY')) return 'weekly'
  if (rule.includes('MONTHLY')) return 'monthly'
  return 'once'
}

function toLocalDateParts(iso: string) {
  const d = new Date(iso)
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return { date, time }
}

const blank = { title_en: '', title_ur: '', date: '', time: '', frequency: 'once' as Frequency, description_en: '', description_ur: '' }

export default function AdminSchedule() {
  const qc = useQueryClient()
  const [form, setForm] = useState(blank)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>(null)

  const { data: sessions } = useQuery({
    queryKey: ['schedule'],
    queryFn: () => api.get<any[]>('/schedule'),
  })

  function buildPayload(body: typeof blank) {
    const scheduled_at = new Date(`${body.date}T${body.time || '00:00'}`).toISOString()
    const rule = FREQ_RULES[body.frequency]
    return {
      title_en: body.title_en, title_ur: body.title_ur,
      scheduled_at,
      is_recurring: body.frequency !== 'once',
      recurrence_rule: rule ?? undefined,
      description_en: body.description_en || undefined,
      description_ur: body.description_ur || undefined,
    }
  }

  const create = useMutation({
    mutationFn: (body: typeof blank) => api.post('/admin/schedule', buildPayload(body)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedule'] }); setForm(blank); setError('') },
    onError: (e: any) => setError(e.message),
  })

  const update = useMutation({
    mutationFn: ({ id, ...body }: any) => api.put(`/admin/schedule/${id}`, buildPayload(body)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedule'] }); setExpandedId(null) },
    onError: (e: any) => setError(e.message),
  })

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/schedule/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedule'] }); setExpandedId(null) },
  })

  function openEdit(s: any) {
    if (expandedId === s.id) { setExpandedId(null); return }
    const { date, time } = toLocalDateParts(s.scheduled_at)
    setExpandedId(s.id)
    setEditForm({
      id: s.id,
      title_en: s.title_en, title_ur: s.title_ur,
      date, time,
      frequency: ruleToFreq(s.recurrence_rule),
      description_en: s.description_en ?? '',
      description_ur: s.description_ur ?? '',
    })
  }

  const freqLabel = (s: any) => {
    if (!s.is_recurring) return 'Once'
    if (s.recurrence_rule?.includes('DAILY')) return 'Daily'
    if (s.recurrence_rule?.includes('WEEKLY')) return 'Weekly'
    if (s.recurrence_rule?.includes('MONTHLY')) return 'Monthly'
    return 'Recurring'
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '1.5rem' }}>Schedule</h1>

      {/* Create form */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg-muted)', marginBottom: '1rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>New Session</p>
        <SessionFields form={form} setForm={setForm} />
        {error && <p style={{ color: '#e05050', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</p>}
        <button
          onClick={() => create.mutate(form)}
          disabled={!form.title_en || !form.title_ur || !form.date || create.isPending}
          style={{ ...btnStyle, opacity: !form.title_en || !form.title_ur || !form.date ? 0.5 : 1 }}
        >
          {create.isPending ? 'Creating...' : 'Add Session'}
        </button>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {sessions?.length === 0 && (
          <p style={{ color: 'var(--fg-subtle)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>No sessions scheduled</p>
        )}
        {sessions?.map((s: any) => (
          <div key={s.id} style={{ background: 'var(--bg-card)', border: `1px solid ${expandedId === s.id ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 8, overflow: 'hidden', transition: 'border-color 0.15s' }}>
            <div onClick={() => openEdit(s)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer' }}>
              <div>
                <p style={{ fontWeight: 500, color: 'var(--fg)', fontSize: '0.9rem' }}>{s.title_en}</p>
                <p style={{ color: 'var(--fg-muted)', fontSize: '0.82rem', marginTop: 2 }}>
                  {new Date(s.next_at ?? s.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  <span style={{ margin: '0 6px', color: 'var(--border)' }}>·</span>
                  <span style={{ color: 'var(--gold)' }}>{freqLabel(s)}</span>
                </p>
              </div>
              <span style={{ color: 'var(--fg-subtle)', fontSize: '0.8rem' }}>{expandedId === s.id ? '▲' : '▼'}</span>
            </div>

            {expandedId === s.id && editForm && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '14px' }}>
                <SessionFields form={editForm} setForm={setEditForm} />
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                  <button onClick={() => del.mutate(s.id)} style={{ background: 'none', border: '1px solid #e05050', borderRadius: 6, color: '#e05050', fontSize: '0.82rem', padding: '6px 14px', cursor: 'pointer' }}>Delete</button>
                  <button onClick={() => setExpandedId(null)} style={{ background: 'var(--border)', border: 'none', borderRadius: 6, color: 'var(--fg)', fontSize: '0.82rem', padding: '6px 14px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={() => update.mutate(editForm)} disabled={update.isPending} style={{ ...btnStyle, padding: '6px 18px' }}>
                    {update.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SessionFields({ form, setForm }: { form: any; setForm: any }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <input placeholder="Title (English)" value={form.title_en} onChange={e => setForm((f: any) => ({ ...f, title_en: e.target.value }))} style={inputStyle} />
        <input placeholder="عنوان (اردو)" dir="rtl" value={form.title_ur} onChange={e => setForm((f: any) => ({ ...f, title_ur: e.target.value }))} style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <input placeholder="Description (English)" value={form.description_en} onChange={e => setForm((f: any) => ({ ...f, description_en: e.target.value }))} style={inputStyle} />
        <input placeholder="تفصیل (اردو)" dir="rtl" value={form.description_ur} onChange={e => setForm((f: any) => ({ ...f, description_ur: e.target.value }))} style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <label style={labelStyle}>Date</label>
          <input type="date" value={form.date} onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))} style={{ ...inputStyle, colorScheme: 'dark light' }} />
        </div>
        <div>
          <label style={labelStyle}>Time</label>
          <TimeInput value={form.time} onChange={time => setForm((f: any) => ({ ...f, time }))} />
        </div>
        <div>
          <label style={labelStyle}>Frequency</label>
          <select value={form.frequency} onChange={e => setForm((f: any) => ({ ...f, frequency: e.target.value }))} style={inputStyle}>
            <option value="once">Once</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>
    </>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', color: 'var(--fg-muted)', marginBottom: 4, fontWeight: 500 }

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid var(--border)', borderRadius: 7,
  padding: '8px 12px', fontSize: '0.88rem',
  background: 'var(--bg)', color: 'var(--fg)', outline: 'none',
}

const btnStyle: React.CSSProperties = {
  background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-fg)',
  border: 'none', borderRadius: 7, padding: '8px 18px',
  fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer',
}
