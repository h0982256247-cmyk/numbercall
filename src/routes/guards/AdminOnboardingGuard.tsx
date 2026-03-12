/**
 * AdminOnboardingGuard
 *
 * 只允許「尚未完成 onboarding」的 admin 進入 /admin/onboarding
 * 已完成 onboarding 的 admin → 自動導向 /admin/dashboard
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useAdminUser } from '@/features/auth/useAdminUser'
import { PageLoader } from '@/components/ui/Spinner'

export default function AdminOnboardingGuard() {
  const { loading, isOnboarded } = useAdminUser()

  if (loading) return <PageLoader />
  if (isOnboarded) return <Navigate to="/admin/dashboard" replace />
  return <Outlet />
}
