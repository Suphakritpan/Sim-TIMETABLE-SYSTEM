/** ตั้ง title, description, canonical, og/twitter และ BreadcrumbList JSON-LD ของหน้าปัจจุบัน (แก้แท็กเดิมใน index.html ไม่สร้างซ้ำ); ใช้ที่ pages/ ทุกหน้า */
import { useEffect } from 'react'
import { ENV } from '../config/env'
import { MSG } from '../config/messages'
import { ROUTES } from '../config/constants'

function setMeta(selector, attr, value) {
  document.head.querySelector(selector)?.setAttribute(attr, value)
}

/**
 * @param {keyof typeof MSG.seo} page คีย์ใน MSG.seo (ตรงกับคีย์ใน ROUTES ยกเว้น notFound)
 * @param {{noindex?: boolean}} [options] noindex=true สำหรับหน้า 404/error
 */
export default function usePageMeta(page, { noindex = false } = {}) {
  useEffect(() => {
    const { title, description } = MSG.seo[page]
    const path = ROUTES[page] ?? ''
    const url = `${ENV.siteUrl}${path === '/' ? '/' : path}`
    document.title = title
    setMeta('meta[name="description"]', 'content', description)
    setMeta('link[rel="canonical"]', 'href', url)
    for (const [selector, value] of [['meta[property="og:title"]', title], ['meta[property="og:description"]', description], ['meta[property="og:url"]', url], ['meta[name="twitter:title"]', title], ['meta[name="twitter:description"]', description]]) {
      setMeta(selector, 'content', value)
    }
    let robots = document.head.querySelector('meta[name="robots"]')
    if (noindex && !robots) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      document.head.appendChild(robots)
    }
    if (robots) robots.content = noindex ? 'noindex' : 'index, follow'

    let ld = document.head.querySelector('script#ld-breadcrumb')
    if (!ld) {
      ld = document.createElement('script')
      ld.id = 'ld-breadcrumb'
      ld.type = 'application/ld+json'
      document.head.appendChild(ld)
    }
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: MSG.app.name, item: `${ENV.siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: title, item: url },
      ],
    })
  }, [page, noindex])
}
