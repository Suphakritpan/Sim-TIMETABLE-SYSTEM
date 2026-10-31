/** กราฟแท่งเทียบวิธีพื้นฐานกับวิธีของทีม (Recharts โหลดแบบ lazy เฉพาะหน้า 5); มีตารางข้อมูลเทียบเท่าอยู่ข้างบนจึงไม่พึ่งกราฟอย่างเดียว */
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MSG } from '../../config/messages'

const CHART_KEYS = ['conflicts', 'otherViolations', 'penalty']

export default function EvaluationChart({ evaluation }) {
  const [base, team] = ['baseline', 'team'].map((m) => evaluation.methods.find((x) => x.method === m))
  const label = (key) => evaluation.metricDefinitions.find((d) => d.key === key)?.label ?? key
  const data = CHART_KEYS.filter((k) => k in base.metrics).map((k) => ({ name: label(k), baseline: base.metrics[k], team: team.metrics[k] }))
  return (
    <div className="h-72" role="img" aria-label={MSG.evaluation.chartTitle}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid vertical={false} stroke="var(--p-sky-100)" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="baseline" name={MSG.evaluation.baseline} fill="var(--p-sky-300)" radius={[8, 8, 0, 0]} />
          <Bar dataKey="team" name={MSG.evaluation.team} fill="var(--p-blue-600)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
