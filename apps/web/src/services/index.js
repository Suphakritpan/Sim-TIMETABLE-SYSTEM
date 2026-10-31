/** จุดเดียวที่อ่าน VITE_DATA_MODE แล้วเลือก implementation (mock หรือ HTTP) ตาม ARCHITECTURE §3; pages นำเข้าจากที่นี่เท่านั้น */
import { ENV } from '../config/env'
import * as mock from '../mocks/mockServices'
import * as http from './httpServices'

const impl = ENV.dataMode === 'mock' ? mock : http

export const { importService, requestService, scheduleService, evaluationService, exportService } = impl
