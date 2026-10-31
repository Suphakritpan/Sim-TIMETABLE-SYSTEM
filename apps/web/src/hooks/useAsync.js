/** รัน service call พร้อมสถานะ idle|loading|success|error; run() คืนผลหรือ undefined เมื่อล้มเหลว (ข้อผิดพลาดอยู่ใน state.error) ใช้ที่ pages/ */
import { useCallback, useState } from 'react'

export default function useAsync() {
  const [state, setState] = useState({ status: 'idle', data: null, error: null })
  const run = useCallback(async (fn) => {
    setState({ status: 'loading', data: null, error: null })
    try {
      const data = await fn()
      setState({ status: 'success', data, error: null })
      return data
    } catch (error) {
      setState({ status: 'error', data: null, error })
      return undefined
    }
  }, [])
  return { ...state, run }
}
