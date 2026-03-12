import { Ticket } from 'lucide-react'

export default function HomePage() {
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
