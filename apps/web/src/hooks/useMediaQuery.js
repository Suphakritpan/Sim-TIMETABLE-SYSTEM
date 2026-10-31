/** ติดตามผลของ media query (เช่น จอแคบ) แล้วคืน true/false; ใช้ที่ TimetablePage เพื่อสลับเป็นมุมมองทีละวันบนมือถือ */
import { useEffect, useState } from 'react'

/** @param {string} query เช่น '(max-width: 767px)' @returns {boolean} */
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = (e) => setMatches(e.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])
  return matches
}
