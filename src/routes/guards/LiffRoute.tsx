import { LiffProvider, useLiff } from '@/features/liff/LiffProvider'
import { Outlet } from 'react-router-dom'

function LiffContent() {
  const { ready, loggedIn } = useLiff()
  // LiffProvider handles redirect to LINE login if not logged in
  if (!ready || !loggedIn) return null
  return <Outlet />
}

export default function LiffRoute() {
  return (
    <LiffProvider>
      <LiffContent />
    </LiffProvider>
  )
}
