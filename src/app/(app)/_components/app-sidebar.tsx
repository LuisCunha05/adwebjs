import { Suspense } from 'react'
import {
  CalendarClock,
  FolderOpen,
  FolderTree,
  LayoutDashboard,
  Users,
} from 'lucide-react'
import { SidebarItem, SidebarItemSkeleton } from './sidebar-item'
import { SidebarAdminItem } from './sidebar-admin-item'
import { ThemeToggle } from './theme-toggle'
import { UserDropdown, UserDropdownSkeleton } from './user-dropdown'

const SIDEBAR_ITEMS = [
  { href: '/', label: 'Início', icon: LayoutDashboard },
  { href: '/users', label: 'Usuários', icon: Users },
  { href: '/groups', label: 'Grupos', icon: FolderTree },
  { href: '/ous', label: 'OUs', icon: FolderOpen },
  { href: '/schedule', label: 'Agendamentos', icon: CalendarClock },
]

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-56 border-r border-border bg-card shadow-sm transition-[width] duration-200">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LayoutDashboard className="size-4 shrink-0" />
        </div>
        <span className="font-semibold tracking-tight">AD Manager</span>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {SIDEBAR_ITEMS.map((item) => (
          <SidebarItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={<item.icon className="size-4 shrink-0" />}
          />
        ))}
        <Suspense fallback={<SidebarItemSkeleton />}>
          <SidebarAdminItem />
        </Suspense>
      </nav>
      <div className="absolute bottom-0 left-0 right-0 border-t border-border p-3 space-y-2">
        <ThemeToggle />
        <Suspense fallback={<UserDropdownSkeleton />}>
          <UserDropdown />
        </Suspense>
      </div>
    </aside>
  )
}
