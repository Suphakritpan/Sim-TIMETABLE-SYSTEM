/** ปุ่มดาวน์โหลดแม่แบบเปล่าและไฟล์ตัวอย่าง 3 ขนาด (โจทย์หน้า 1); ไฟล์ที่ยังไม่มีแสดงสถานะตรง ๆ ไม่ปลอม */
import { Download, FileSpreadsheet } from 'lucide-react'
import { SAMPLE_FILES } from '../../config/constants'
import { MSG } from '../../config/messages'
import Card from '../common/Card'

export default function SampleDownloads() {
  return (
    <Card title={MSG.import.samplesTitle}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {SAMPLE_FILES.map(({ key, href, available }) => {
          const [name, note] = MSG.import.samples[key]
          const body = (
            <>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-action-soft-bg text-action-soft-text"><FileSpreadsheet size={20} aria-hidden /></span>
              <span className="flex-1"><span className="block text-sm font-semibold">{name}</span><span className="block text-xs text-ink-muted">{note}</span></span>
              {available && <Download size={16} aria-label={MSG.import.download} />}
            </>
          )
          return (
            <li key={key}>
              {available
                ? <a href={href} download className="flex min-h-14 items-center gap-3 rounded-md border border-line-control p-3 hover:border-action hover:bg-hover">{body}</a>
                : <div aria-disabled="true" className="flex min-h-14 items-center gap-3 rounded-md border border-dashed border-line-subtle p-3 text-ink-muted">{body}</div>}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
