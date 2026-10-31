/** พื้นหลังเคลื่อนไหวเบา ๆ: เส้นกริดฟ้าอ่อนลอยช้า + วงแสงฟ้า 2 วง; ตกแต่งล้วน (aria-hidden) ใช้ที่ AppShell */
export default function MotionBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -inset-16 animate-grid-drift bg-size-[64px_64px] bg-[linear-gradient(to_right,var(--p-sky-100)_1px,transparent_1px),linear-gradient(to_bottom,var(--p-sky-100)_1px,transparent_1px)]" />
      <div className="absolute -right-24 -top-24 size-96 animate-float-slow rounded-full bg-tint blur-3xl" />
      <div className="absolute -bottom-32 left-1/3 size-96 animate-float-slow rounded-full bg-action-soft-bg opacity-60 blur-3xl [animation-delay:-8s]" />
    </div>
  )
}
