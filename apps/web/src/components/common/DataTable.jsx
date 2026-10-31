/** ตารางข้อมูลตาม DESIGN_SYSTEM §3 DataTable: <table> จริง, เลื่อนแนวนอนในกรอบ, แบ่งหน้า (≤ TABLE_PAGE_SIZE แถว) */
import { useState } from 'react'
import { TABLE_PAGE_SIZE } from '../../config/constants'
import Button from './Button'

/** @param {{columns:Array<{key:string,label:string,align?:'right',render?:(row:any)=>any}>, rows:any[], caption:string, rowKey:(row:any)=>string, minWidth?:string}} props */
export default function DataTable({ columns, rows, caption, rowKey, minWidth = 'min-w-120' }) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(rows.length / TABLE_PAGE_SIZE))
  const shown = rows.slice(page * TABLE_PAGE_SIZE, (page + 1) * TABLE_PAGE_SIZE)
  return (
    <div className="rounded-lg border border-line-subtle bg-page shadow-card">
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={caption}>
        <table className={`w-full text-left text-sm ${minWidth}`}>
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-subtle text-xs">
            <tr>{columns.map((c) => <th key={c.key} scope="col" className={`p-3 font-semibold ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={rowKey(row)} className="border-t border-line-subtle hover:bg-hover">
                {columns.map((c) => <td key={c.key} className={`p-3 align-top ${c.align === 'right' ? 'text-right' : ''}`}>{c.render ? c.render(row) : row[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-end gap-3 border-t border-line-subtle p-3 text-sm">
          <Button variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</Button>
          <span>{page + 1} / {pages}</span>
          <Button variant="ghost" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>›</Button>
        </div>
      )}
    </div>
  )
}
