/** ค่าคงที่ของระบบ: วัน/คาบ/เวลา, เส้นทาง, ไฟล์ตัวอย่าง ที่เดียวที่ประกาศ (CLAUDE.md §10.4); ค่าคาบจริงของแต่ละชุดข้อมูลมาจาก import.periods */

export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI']

export const DAY_LABELS = {
  MON: 'จันทร์',
  TUE: 'อังคาร',
  WED: 'พุธ',
  THU: 'พฤหัสบดี',
  FRI: 'ศุกร์',
}

// ช่วงเวลาของแต่ละคาบ (ชั่วโมงเริ่ม) ตามกติกาโจทย์ §3: คาบละ 1 ชั่วโมง เช้า 1-4 บ่าย 5-8
export const PERIOD_START_HOURS = [8, 9, 10, 11, 13, 14, 15, 16]
export const LUNCH_AFTER_PERIOD = 4

export const ROUTES = {
  import: '/',
  requests: '/requests',
  generate: '/generate',
  timetable: '/timetable',
  evaluation: '/evaluation',
  summary: '/summary',
}

export const JOB_TERMINAL_STATUSES = ['completed', 'completed_partial', 'infeasible', 'failed', 'cancelled']
export const JOB_STAGES = ['QUEUED', 'VALIDATING', 'ASSIGNING_SLOTS', 'RESOLVING_CONFLICTS', 'FINALIZING']

export const REQUEST_CATEGORIES = ['must', 'best_effort', 'no_action']
export const DEFAULT_SEED = 42
export const SEARCH_RESULT_LIMIT = 8
export const TABLE_PAGE_SIZE = 50
export const TOAST_DISMISS_MS = 6000
export const NARROW_QUERY = '(max-width: 767px)' // ต่ำกว่า md ของ Tailwind: ใช้มุมมองตารางทีละวัน
export const COMPARE_MAX_WAIT_MS = 180000
export const GENERATE_METHOD = 'team'
export const SESSION_STORAGE_KEY = 'sim-timetable-session'

// ไฟล์ตัวอย่าง 3 ขนาดตามโจทย์หน้า 1 สร้างโดย scripts/generate_sample_data.py (ข้อมูลสมมติ ตรวจแล้วว่าจัดตารางได้)
export const SAMPLE_FILES = [
  { key: 'template', href: '/samples/template-blank.xlsx', available: true },
  { key: 'small', href: '/samples/sample-small-team.xlsx', available: true },
  { key: 'medium', href: '/samples/sample-medium-team.xlsx', available: true },
  { key: 'large', href: '/samples/sample-large-team.xlsx', available: true },
]
