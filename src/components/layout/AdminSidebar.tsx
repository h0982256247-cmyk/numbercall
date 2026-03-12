import { NavLink, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import {
  LayoutDashboard, CalendarDays, Users, Settings,
  LogOut, Ticket, ChevronRight
} from 'lucide-react'

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: '工作台' },
  { to: '/admin/events',    icon: CalendarDays,    label: '活動管理' },
  { to: '/admin/users',     icon: Users,           label: '使用者' },
  { to: '/admin/settings',  icon: Settings,        label: '設定' },
]

interface AdminSidebarProps {
  brandName?: string
  onClose?: () => void
}

export default function AdminSidebar({ brandName, onClose }: AdminSidebarProps) {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('已登出')
    navigate('/admin/login')
  }

  return (
    <aside className="flex flex-col h-full bg-white border-r border-gray-100">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center">
            <Ticket className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">QueueFlow</p>
            <p className="text-sm font-semibold text-gray-900 leading-tight truncate max-w-[140px]">
              {brandName || '品牌後台'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          登出
        </button>
      </div>
    </aside>
  )
}
