import { Navigate, Outlet } from 'react-router-dom'
import { useAdminUser } from '@/features/auth/useAdminUser'
import { PageLoader } from '@/components/ui/Spinner'

export default function OnboardedRoute() {
  const { loading, isOnboarded } = useAdminUser()

  if (loading) return <PageLoader />
  if (!isOnboarded) return <Navigate to="/admin/onboarding" replace />
  return <Outlet />
}
