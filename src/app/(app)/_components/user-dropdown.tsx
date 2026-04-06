'use client'

import { Button } from '@compound/button'
import { LogOut } from 'lucide-react'
import { useAuth, useSession } from '@/components/auth-provider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'

export function UserDropdown() {
  const session = useSession()
  const { logout } = useAuth()

  const displayName = session.user?.sAMAccountName || session.user?.cn || 'Usuário'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-3 px-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-left text-sm">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem onClick={() => logout()}>
          <LogOut className="mr-2 size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function UserDropdownSkeleton() {
  return (
    <div className="flex w-full items-center gap-3 px-3 py-2">
      <Skeleton className="size-8 rounded-full shrink-0" />
      <Skeleton className="h-4 flex-1" />
    </div>
  )
}
