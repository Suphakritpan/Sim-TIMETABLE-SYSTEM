import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import seoFiles from './scripts/seoFiles.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const siteUrl = (process.env.VITE_SITE_URL ?? loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL ?? '').replace(/\/$/, '')
  if (!siteUrl && mode !== 'test') throw new Error('ต้องตั้ง VITE_SITE_URL (โดเมนหลักแบบ absolute) สำหรับ canonical/sitemap')
  return {
    plugins: [react(), tailwindcss(), seoFiles(siteUrl)],
    test: { environment: 'jsdom' },
  }
})
