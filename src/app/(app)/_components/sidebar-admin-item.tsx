'use client'

import { ScrollText } from 'lucide-react'
import { useSession } from '@/components/auth-provider'
import { SidebarItem } from './sidebar-item'

export function SidebarAdminItem() {
  const session = useSession()

  if (!session.isAdmin) {
    return null
  }

  return (
    <SidebarItem
      href="/audit"
      label="Logs de auditoria"
      icon={<ScrollText className="size-4 shrink-0" />}
    />
  )
}
