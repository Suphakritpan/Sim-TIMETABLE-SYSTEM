/** เส้นทางของทั้ง 6 หน้า โหลดแบบ lazy ต่อหน้า (code-splitting ตาม CLAUDE.md §9 ข้อ 20) */
import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router'
import { Skeleton } from '../components/common/StateBox'
import HydrationGate from './HydrationGate'
import AppShell from '../components/layout/AppShell'
import { ROUTES } from '../config/constants'
import { MSG } from '../config/messages'
import NotFoundPage from '../pages/NotFoundPage'

const pages = {
  import: lazy(() => import('../pages/ImportPage')),
  requests: lazy(() => import('../pages/RequestsPage')),
  generate: lazy(() => import('../pages/GeneratePage')),
  timetable: lazy(() => import('../pages/TimetablePage')),
  evaluation: lazy(() => import('../pages/EvaluationPage')),
  summary: lazy(() => import('../pages/SummaryPage')),
}

const element = (Page, title) => <Suspense fallback={<><h1 className="sr-only">{title}</h1><Skeleton rows={4} /></>}><HydrationGate title={title}><Page /></HydrationGate></Suspense>

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <NotFoundPage />,
    children: Object.entries(pages).map(([key, Page], i) => ({ path: ROUTES[key], element: element(Page, MSG.nav[i].name) })),
  },
  { path: '*', element: <NotFoundPage /> },
])
