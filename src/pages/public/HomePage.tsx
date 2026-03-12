import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ticket } from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()

  useEffect(() => {
    // LINE OAuth 導回根路由後，帶有 liff.state query 參數
    // 讀取之前儲存的 brandSlug，重定向到品牌路由讓 LiffRoute 處理 LIFF 登入回調
    const hasLiffState = new URLSearchParams(window.location.search).has('liff.state')
    const brandSlug = sessionStorage.getItem('liff_brand_slug')
    if (hasLiffState && brandSlug) {
      navigate(`/b/${brandSlug}${window.location.search}`, { replace: true })
    }
  }, [navigate])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-brand-600 flex items-center justify-center mb-6 shadow-lg">
        <Ticket className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">QueueFlow</h1>
      <p className="text-gray-500 text-sm">
        請掃描活動現場的 QR Code<br />進入排隊系統
      </p>
    </div>
  )
}
