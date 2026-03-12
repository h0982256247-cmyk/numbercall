import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from './Button'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">系統發生錯誤</h2>
            <p className="text-sm text-gray-500 mb-1">
              {this.state.error?.message || '發生未知錯誤'}
            </p>
            <p className="text-xs text-gray-400 mb-6">請重新整理頁面，或聯繫系統管理員</p>
            <Button onClick={() => window.location.reload()}>
              重新整理
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
