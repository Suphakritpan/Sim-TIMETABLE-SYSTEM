/** การ์ดตาม DESIGN_SYSTEM §3 Card; feature=พื้น tint + radius-xl, deep=พื้นน้ำเงินเข้ม (จุดเด่น 1 ใบต่อหน้า) */
export default function Card({ feature = false, deep = false, title, children, className = '', ...rest }) {
  return (
    <section className={`border border-line-subtle p-4 shadow-card md:p-6 ${deep ? 'rounded-xl border-action-press bg-action-press text-on-action' : feature ? 'rounded-xl bg-tint' : 'rounded-lg bg-page'} ${className}`} {...rest}>
      {title && <h2 className="mb-4 font-display text-lg font-semibold">{title}</h2>}
      {children}
    </section>
  )
}
