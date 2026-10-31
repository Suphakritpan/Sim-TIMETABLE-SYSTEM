/** เพิ่มคำขอใหม่ 2 ทาง: พิมพ์ภาษาไทยให้ระบบอ่าน (ถ้าล้มเหลวยังมีฟอร์ม) และฟอร์มเงื่อนไขที่ใช้ได้โดยไม่ต้องพึ่ง AI (โจทย์หน้า 2) */
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { DAYS, DAY_LABELS } from '../../config/constants'
import { MSG } from '../../config/messages'
import { requestService } from '../../services'
import useAsync from '../../hooks/useAsync'
import { nextManualId } from '../../utils/requestIds'
import Button from '../common/Button'
import Card from '../common/Card'
import Field from '../common/Field'
import { ErrorState } from '../common/StateBox'

const KIND_FIELD = { teacher_unavailable: 'teacherId', group_unavailable: 'groupId', room_closed: 'roomId' }

function targetOptions(kind, imp) {
  if (kind === 'teacher_unavailable') return imp.teachers.map((t) => ({ id: t.id, label: `${t.name} (${t.id})` }))
  if (kind === 'group_unavailable') return imp.groups.map((g) => ({ id: g.id, label: `${g.name} (${g.id})` }))
  return imp.rooms.map((r) => ({ id: r.id, label: `${r.name} (${r.id})` }))
}

/** @param {{imp: object, rows: Array<{id: string}>, onAdd: (row: object) => void}} props rows = คำขอที่มีอยู่ (ใช้หารหัส M ถัดไปที่ไม่ซ้ำ) */
export default function AddRequestForm({ imp, rows, onAdd }) {
  const [text, setText] = useState('')
  const [kind, setKind] = useState('teacher_unavailable')
  const [form, setForm] = useState({ target: '', day: 'MON', from: 1, to: 8, category: 'must' })
  const interpret = useAsync()
  const PERIODS = Array.from({ length: imp.periods.perDay }, (_, i) => i + 1)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const invalid = Number(form.from) > Number(form.to)

  const submitText = async (e) => {
    e.preventDefault()
    const out = await interpret.run(() => requestService.interpret(imp.importId, text.trim()))
    if (!out) return
    const { request, confidence } = out
    onAdd({ ...request, sender: MSG.requests.userSender, confidence, confirmed: false, failed: false })
    setText('')
  }

  const submitForm = (e) => {
    e.preventDefault()
    if (!form.target || invalid) return
    const periods = PERIODS.filter((p) => p >= Number(form.from) && p <= Number(form.to))
    const label = targetOptions(kind, imp).find((o) => o.id === form.target).label
    const understanding = MSG.requests.manualUnderstanding(label, DAY_LABELS[form.day], form.from, form.to)
    onAdd({ id: nextManualId(rows), text: understanding, sender: MSG.requests.userSender, kind, category: form.category, params: { [KIND_FIELD[kind]]: form.target, day: form.day, periods }, understanding, status: 'manual', confirmed: true, failed: false })
  }

  return (
    <Card title={MSG.requests.addTitle}>
      <form onSubmit={submitText} className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field as="textarea" rows={2} label={MSG.requests.addTextLabel} placeholder={MSG.requests.addTextPlaceholder} value={text} onChange={(e) => setText(e.target.value)} />
        <Button type="submit" loading={interpret.status === 'loading'} disabled={!text.trim()}>{interpret.status === 'loading' ? MSG.requests.interpreting : MSG.requests.addTextButton}</Button>
      </form>
      {interpret.error && <div className="mb-6"><ErrorState error={interpret.error} /></div>}
      <h3 className="mb-3 font-medium">{MSG.requests.formTitle}</h3>
      <form onSubmit={submitForm} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field as="select" label={MSG.requests.formKind} value={kind} onChange={(e) => { setKind(e.target.value); setForm({ ...form, target: '' }) }}>
          {Object.entries(MSG.requests.formKinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Field>
        <Field as="select" label={MSG.requests.formTarget[kind]} value={form.target} onChange={set('target')} required>
          <option value="">{MSG.requests.pickTarget}</option>
          {targetOptions(kind, imp).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </Field>
        <Field as="select" label={MSG.requests.formDay} value={form.day} onChange={set('day')}>
          {DAYS.map((d) => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
        </Field>
        <Field as="select" label={MSG.requests.formFrom} value={form.from} onChange={set('from')}>{PERIODS.map((p) => <option key={p}>{p}</option>)}</Field>
        <Field as="select" label={MSG.requests.formTo} value={form.to} onChange={set('to')} error={invalid ? MSG.requests.formInvalid : undefined}>{PERIODS.map((p) => <option key={p}>{p}</option>)}</Field>
        <Field as="select" label={MSG.requests.formCategory} value={form.category} onChange={set('category')}>
          {Object.entries(MSG.requests.categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Field>
        <div className="sm:col-span-2 lg:col-span-3"><Button type="submit" variant="secondary" icon={Plus} disabled={invalid || !form.target}>{MSG.requests.formAdd}</Button></div>
      </form>
    </Card>
  )
}
