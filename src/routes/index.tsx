import { createBrowserRouter } from 'react-router-dom'

// Layouts
import PublicLayout from '@/components/layout/PublicLayout'
import AdminLayout from '@/components/layout/AdminLayout'

// Guards
import AdminRoute from './guards/AdminRoute'
import OnboardedRoute from './guards/OnboardedRoute'
import LiffRoute from './guards/LiffRoute'
import AdminOnboardingGuard from './guards/AdminOnboardingGuard'

// Public pages
import HomePage from '@/pages/public/HomePage'
import QueuePage from '@/pages/public/QueuePage'
import MyTicketPage from '@/pages/public/MyTicketPage'
import MyHistoryPage from '@/pages/public/MyHistoryPage'

// Admin pages
import LoginPage from '@/pages/admin/LoginPage'
import OnboardingPage from '@/pages/admin/OnboardingPage'
import DashboardPage from '@/pages/admin/DashboardPage'
import EventsPage from '@/pages/admin/EventsPage'
import EventDetailPage from '@/pages/admin/EventDetailPage'
import EventQueuePage from '@/pages/admin/EventQueuePage'
import EventReportsPage from '@/pages/admin/EventReportsPage'
import UsersPage from '@/pages/admin/UsersPage'
import SettingsPage from '@/pages/admin/SettingsPage'

// Error / 404
import NotFoundPage from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  // ─── Public (前台) ──────────────────────────────────────
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
    ],
  },
  // LIFF-protected routes
  {
    element: <LiffRoute />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/queue/:slug',  element: <QueuePage /> },
          { path: '/my-ticket',   element: <MyTicketPage /> },
          { path: '/my-history',  element: <MyHistoryPage /> },
        ],
      },
    ],
  },

  // ─── Admin (後台) ────────────────────────────────────────
  { path: '/admin/login', element: <LoginPage /> },

  // Auth required
  {
    element: <AdminRoute />,
    children: [
      // Onboarding — 只允許「尚未完成」的 admin 進入，已完成 → /admin/dashboard
      {
        element: <AdminOnboardingGuard />,
        children: [
          { path: '/admin/onboarding', element: <OnboardingPage /> },
        ],
      },

      // Auth + Onboarded required
      {
        element: <OnboardedRoute />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { path: '/admin/dashboard',                         element: <DashboardPage /> },
              { path: '/admin/events',                            element: <EventsPage /> },
              { path: '/admin/events/:eventId',                   element: <EventDetailPage /> },
              { path: '/admin/events/:eventId/queue',             element: <EventQueuePage /> },
              { path: '/admin/events/:eventId/reports',           element: <EventReportsPage /> },
              { path: '/admin/users',                             element: <UsersPage /> },
              { path: '/admin/settings',                          element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },

  // ─── 404 ────────────────────────────────────────────────
  { path: '*', element: <NotFoundPage /> },
])
