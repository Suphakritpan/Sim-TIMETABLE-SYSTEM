/** หน้า 5 ผลการใช้ AI: เทียบวิธีพื้นฐานกับวิธีของทีมบนข้อมูลเดียวกัน, อธิบายวิธี, กดซ้ำด้วย seed เดิมแล้วเทียบผล */
import { ArrowRight, Scale } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '../app/sessionContext'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import DataTable from '../components/common/DataTable'
import Field from '../components/common/Field'
import PageHeader, { SectionTitle } from '../components/common/PageHeader'
import { EmptyState, ErrorState, Skeleton } from '../components/common/StateBox'
import StatusPill from '../components/common/StatusPill'
import { ROUTES } from '../config/constants'
import { MSG } from '../config/messages'
import usePageMeta from '../hooks/usePageMeta'
import useAsync from '../hooks/useAsync'
import { evaluationService } from '../services'

const EvaluationChart = lazy(() => import('../components/evaluation/EvaluationChart'))
const E = MSG.evaluation
const TIME_KEY = 'elapsedSeconds'

/** ผลเท่ากันเมื่อทุกตัวชี้วัด "ยกเว้นเวลา" ตรงกัน (เวลาแปรตามเครื่อง) */
function sameResult(a, b) {
  const strip = (ev) => JSON.stringify(ev.methods.map((m) => Object.entries(m.metrics).filter(([k]) => k !== TIME_KEY)))
  return strip(a) === strip(b)
}

export default function EvaluationPage() {
  usePageMeta('evaluation')
  const nav = useNavigate()
  const { importData: imp, confirmed, requests, seed } = useSession()
  const [seedText, setSeedText] = useState(String(seed))
  const [runs, setRuns] = useState([])
  const run = useAsync()
  const latest = runs[runs.length - 1]
  const previous = runs[runs.length - 2]

  if (!confirmed) {
    return (
      <>
        <PageHeader eyebrow={E.eyebrow} title={E.title} />
        <EmptyState title={MSG.app.needImport} body={MSG.app.needImportHint} action={<Button onClick={() => nav(ROUTES.import)}>{MSG.app.goImport}</Button>} />
      </>
    )
  }

  const valid = /^\d+$/.test(seedText)
  const compare = async () => {
    const body = requests.filter((r) => r.confirmed).map(({ id, kind, category, params }) => ({ id, kind, category, params }))
    const out = await run.run(() => evaluationService.run({ importId: imp.importId, seed: Number(seedText), requests: body }))
    if (out) setRuns((r) => [...r, out])
  }
  const metric = (m, key) => latest.methods.find((x) => x.method === m).metrics[key]
  const rows = latest ? latest.metricDefinitions.map((d) => ({ ...d, baseline: metric('baseline', d.key), team: metric('team', d.key) })) : []
  const better = (d) => (d.higherIsBetter ? d.team > d.baseline : d.team < d.baseline)

  return (
    <>
      <PageHeader eyebrow={E.eyebrow} title={E.title} lead={E.lead} />
      <Card className="mb-8">
        <form onSubmit={(e) => { e.preventDefault(); if (valid && run.status !== 'loading') compare() }} className="flex flex-wrap items-start gap-4">
          <div className="w-full sm:w-64"><Field label={E.seedLabel} inputMode="numeric" value={seedText} onChange={(e) => setSeedText(e.target.value)} error={valid ? undefined : MSG.generate.seedInvalid} /></div>
          <div className="sm:mt-6"><Button type="submit" icon={Scale} loading={run.status === 'loading'} disabled={!valid}>{run.status === 'loading' ? E.running : latest ? E.repeat : E.run}</Button></div>
        </form>
      </Card>
      {run.error && <div className="mb-8"><ErrorState error={run.error} /></div>}
      {run.status === 'loading' && !latest && <Skeleton rows={4} />}
      {!latest && run.status !== 'loading' && !run.error && <EmptyState title={E.emptyTitle} body={E.emptyBody} />}
      {latest && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-3">
            {latest.isSimulated && <StatusPill kind="warning">{E.simulated}</StatusPill>}
            {previous && <StatusPill kind={sameResult(latest, previous) ? 'success' : 'danger'}>{sameResult(latest, previous) ? E.repeatSame : E.repeatDifferent}</StatusPill>}
          </div>
          <DataTable caption={E.title} rowKey={(r) => r.key} rows={rows}
            columns={[
              { key: 'label', label: E.colMetric },
              { key: 'baseline', label: E.baseline, align: 'right' },
              { key: 'team', label: E.team, align: 'right', render: (r) => <span className="inline-flex items-center gap-2 font-semibold">{r.team}{better(r) && <StatusPill kind="success">{E.better}</StatusPill>}</span> },
            ]} />
          <Card title={E.chartTitle}><Suspense fallback={<Skeleton rows={4} />}><EvaluationChart evaluation={latest} /></Suspense></Card>
          <div>
            <SectionTitle>{E.methodTitle}</SectionTitle>
            <div className="grid gap-6 md:grid-cols-2">
              {latest.methods.map((m) => (
                <Card key={m.method} title={E[m.method]} feature={m.method === 'team'}>
                  <dl className="space-y-3 text-sm">
                    <div><dt className="font-medium">{E.methodWhat}</dt><dd className="text-ink-muted">{m.description.method}</dd></div>
                    <div><dt className="font-medium">{E.methodAi}</dt><dd className="text-ink-muted">{m.description.whereAiUsed}</dd></div>
                    <div><dt className="font-medium">{E.methodSettings}</dt><dd className="text-ink-muted">{m.description.settings}</dd></div>
                  </dl>
                </Card>
              ))}
            </div>
          </div>
          <div><Button icon={ArrowRight} onClick={() => nav(ROUTES.summary)}>{E.next}</Button></div>
        </div>
      )}
    </>
  )
}
