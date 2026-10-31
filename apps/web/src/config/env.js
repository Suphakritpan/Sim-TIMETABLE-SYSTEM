/** อ่านและตรวจตัวแปร VITE_* ครั้งเดียวตอนเริ่มแอป; ค่าที่ขาดหรือผิดรูปแบบทำให้ล้มทันที (CLAUDE.md §10.4) ใช้ที่ services/ และ config/constants.js */

function requireNumber(name, raw) {
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`ตัวแปรสภาพแวดล้อม ${name} ต้องเป็นจำนวนบวก (ได้ "${raw}")`)
  }
  return value
}

function requireUrl(name, raw) {
  if (!/^https?:\/\/[^/]+$/.test(raw ?? '')) throw new Error(`ตัวแปรสภาพแวดล้อม ${name} ต้องเป็น URL แบบ absolute ไม่มี / ท้าย (ได้ "${raw}")`)
  return raw
}

const dataMode = import.meta.env.VITE_DATA_MODE
if (dataMode !== 'mock' && dataMode !== 'api') {
  throw new Error(`VITE_DATA_MODE ต้องเป็น mock หรือ api (ได้ "${dataMode}")`)
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''
if (dataMode === 'api' && !apiBaseUrl) {
  throw new Error('โหมด api ต้องตั้ง VITE_API_BASE_URL')
}

export const ENV = {
  dataMode,
  apiBaseUrl,
  siteUrl: requireUrl('VITE_SITE_URL', import.meta.env.VITE_SITE_URL),
  mockScenario: import.meta.env.VITE_MOCK_SCENARIO ?? 'success',
  pollIntervalMs: requireNumber('VITE_POLL_INTERVAL_MS', import.meta.env.VITE_POLL_INTERVAL_MS),
  maxUploadMb: requireNumber('VITE_MAX_UPLOAD_MB', import.meta.env.VITE_MAX_UPLOAD_MB),
  requestTimeoutMs: requireNumber('VITE_REQUEST_TIMEOUT_MS', import.meta.env.VITE_REQUEST_TIMEOUT_MS),
}
