import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Ticket } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
          <Ticket className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="text-6xl font-bold text-gray-200 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">找不到此頁面</h2>
        <p className="text-sm text-gray-500 mb-8">
          你要找的頁面不存在，或連結已失效。
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            返回上一頁
          </Button>
          <Button onClick={() => navigate('/')}>
            回到首頁
          </Button>
        </div>
      </div>
    </div>
  )
}
