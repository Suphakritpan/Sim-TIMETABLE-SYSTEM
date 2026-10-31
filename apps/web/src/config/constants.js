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

export const JOB_TERMINAL_STATUSES = ['completed', 'completed_partial', 'failed', 'cancelled']
export const JOB_STAGES = ['QUEUED', 'VALIDATING', 'ASSIGNING_SLOTS', 'RESOLVING_CONFLICTS', 'FINALIZING']

export const REQUEST_CATEGORIES = ['must', 'best_effort', 'no_action']
export const DEFAULT_SEED = 42
export const SEARCH_RESULT_LIMIT = 8
export const TABLE_PAGE_SIZE = 50
export const TOAST_DISMISS_MS = 6000

// ไฟล์ตัวอย่าง 3 ขนาดตามโจทย์หน้า 1; large ยังไม่มีไฟล์ (ทีมต้องสร้างเอง ~600 รายการ)
export const SAMPLE_FILES = [
  { key: 'template', href: '/samples/template-blank.xlsx', available: true },
  { key: 'small', href: '/samples/sample-small-4-groups.xlsx', available: true },
  { key: 'medium', href: '/samples/sample-medium-12-groups.xlsx', available: true },
  { key: 'large', href: '', available: false },
]
