/** Zod schema ของ response ตาม docs/API-CONTRACT.md (v0.3 §1.2, ตรงกับ SPEC §6 ของ Backend) ตรวจทั้งฝั่ง mock และ api ก่อนถึงหน้า; ฟิลด์ที่ไม่รู้จักถูกเพิกเฉย */
import { z } from 'zod'

const day = z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])
const kind = z.enum(['theory', 'practice'])

const issue = z.object({
  severity: z.enum(['error', 'warning']),
  code: z.string(),
  sheet: z.string(),
  row: z.number().int(),
  column: z.string().optional(),
  message: z.string(),
  fix: z.string().optional(),
})

const teacher = z.object({
  id: z.string(),
  name: z.string(),
  dept: z.string().optional(),
  maxPerDay: z.number().int().optional(),
  unavailable: z.array(z.object({ day, fromPeriod: z.number().int(), toPeriod: z.number().int() })).default([]),
})
const room = z.object({ id: z.string(), name: z.string(), type: z.string(), capacity: z.number().int(), building: z.string().optional() })
const group = z.object({ id: z.string(), name: z.string(), dept: z.string().optional(), size: z.number().int() })
const course = z.object({
  code: z.string(),
  name: z.string(),
  theory: z.number().int(),
  practice: z.number().int(),
  credit: z.number().int().optional(),
  practiceRoomType: z.string().nullable().optional(),
})
const assignment = z.object({ id: z.string(), courseCode: z.string(), groupIds: z.array(z.string()), teacherId: z.string() })
export const datasetSchema = z.object({
  id: z.string(),
  status: z.enum(['valid', 'invalid']),
  confirmed: z.boolean().default(false),
  summary: z.object({
    teachers: z.number().int(),
    rooms: z.number().int(),
    groups: z.number().int(),
    courses: z.number().int().optional(),
    assignments: z.number().int(),
    requests: z.number().int().optional(),
  }),
  issues: z.array(issue),
  periods: z.object({
    days: z.array(day),
    perDay: z.number().int(),
    morning: z.array(z.number().int()).optional(),
    afternoon: z.array(z.number().int()).optional(),
    blocked: z.array(z.object({ day, fromPeriod: z.number().int(), toPeriod: z.number().int() })).default([]),
  }).optional(),
  teachers: z.array(teacher).optional(),
  rooms: z.array(room).optional(),
  groups: z.array(group).optional(),
  courses: z.array(course).optional(),
  assignments: z.array(assignment).optional(),
})

export const requestSchema = z.object({
  id: z.string(),
  text: z.string(),
  sender: z.string().optional(),
  source: z.enum(['rule', 'ai', 'manual']).default('rule'),
  kind: z.string(),
  category: z.enum(['must', 'best_effort', 'no_action']),
  params: z.record(z.string(), z.unknown()).default({}),
  understanding: z.string(),
  confirmed: z.boolean(),
  version: z.number().int(),
  needsPerson: z.boolean().default(false),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
})

export const requestListSchema = z.object({ requests: z.array(requestSchema), unconfirmed: z.number().int() })

const scheduledItem = z.object({ assignmentId: z.string(), roomId: z.string(), day, period: z.number().int(), kind, periodCount: z.number().int() })

export const runSchema = z.object({
  id: z.string().optional(),
  seed: z.number().int().optional(),
  method: z.string().optional(),
  outcome: z.enum(['complete', 'partial', 'infeasible']).optional(),
  items: z.array(scheduledItem),
  conflicts: z.array(z.object({ code: z.string(), assignmentIds: z.array(z.string()), day: day.optional(), period: z.number().int().optional(), message: z.string() })),
  unscheduled: z.array(z.object({ assignmentId: z.string(), reasonCode: z.string(), message: z.string() })),
  stats: z.object({
    totalAssignments: z.number().int(),
    scheduled: z.number().int(),
    unscheduled: z.number().int(),
    teacherConflicts: z.number().int(),
    roomConflicts: z.number().int(),
    groupConflicts: z.number().int(),
    otherViolations: z.number().int(),
    penalty: z.number(),
    elapsedSeconds: z.number(),
  }),
  explanation: z.string().optional(),
  infeasibleReasons: z.array(z.string()).default([]),
  requestResults: z.array(z.object({ requestId: z.string(), outcome: z.enum(['met', 'partial', 'not_met']), reason: z.string() })).default([]),
})

export const jobSchema = z.object({
  id: z.string(),
  kind: z.enum(['schedule', 'compare']),
  status: z.enum(['queued', 'running', 'done', 'failed', 'cancelled']),
  result: z.object({ runId: z.string().optional() }).nullable().optional(),
  error: z.object({ code: z.string(), message: z.string().optional() }).nullable().optional(),
})

/** ข้อมูลแต่ละ event ของ SSE /api/jobs/{id}/events */
export const jobEventSchema = z.object({ stage: z.string().optional(), progress: z.number().min(0).max(1).nullable().optional() })

const metricDef = z.object({ key: z.string(), label: z.string(), higherIsBetter: z.boolean() })

export const evaluationSchema = z.object({
  evaluationId: z.string(),
  seed: z.number().int(),
  isSimulated: z.boolean(),
  methods: z.array(z.object({
    method: z.enum(['baseline', 'team']),
    metrics: z.record(z.string(), z.number()),
    description: z.object({ method: z.string(), whereAiUsed: z.string(), settings: z.string() }),
  })),
  metricDefinitions: z.array(metricDef),
})
