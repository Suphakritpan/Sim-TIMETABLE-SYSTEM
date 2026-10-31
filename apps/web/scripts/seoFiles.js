/** Vite plugin: สร้าง robots.txt, sitemap.xml, llms.txt ตอน build จาก VITE_SITE_URL และรายการเส้นทางใน config/constants.js (CLAUDE.md §9 ข้อ 12, 13, 15) */
import { ROUTES } from '../src/config/constants.js'

const AI_CRAWLERS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']

/** @param {string} siteUrl โดเมนหลักแบบ absolute ไม่มี / ท้าย */
export default function seoFiles(siteUrl) {
  const urls = Object.values(ROUTES).map((path) => `${siteUrl}${path === '/' ? '' : path}`)
  const robots = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
    // อนุญาต AI crawler ชัดเจนตามข้อ 13 (เนื้อหาสาธารณะ)
    ...AI_CRAWLERS.flatMap((bot) => [`User-agent: ${bot}`, 'Allow: /', 'Disallow: /api/', '']),
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n')
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`
  const llms = [
    '# ระบบจัดตารางสอนอัตโนมัติ (Sim Timetable)',
    '',
    '> เว็บสำหรับอัปโหลดไฟล์ Excel ข้อมูลวิทยาลัย แล้วจัดตารางสอนอัตโนมัติที่ครู ห้อง และกลุ่มเรียนไม่ซ้อนเวลากัน ดูตารางรายสัปดาห์ และส่งออก PDF/Excel',
    '',
    '## หน้าหลัก',
    ...urls.map((u, i) => `- [ขั้นตอนที่ ${i + 1}](${u})`),
    '',
  ].join('\n')
  return {
    name: 'seo-files',
    generateBundle() {
      for (const [fileName, source] of [['robots.txt', robots], ['sitemap.xml', sitemap], ['llms.txt', llms]]) {
        this.emitFile({ type: 'asset', fileName, source })
      }
    },
  }
}
