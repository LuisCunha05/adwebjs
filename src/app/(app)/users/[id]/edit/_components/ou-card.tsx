import { FolderTree } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ActiveDirectoryUser } from '@/schemas/attributesAd'
import type { OU } from '@/types/ldap'
import { MoveOuModal } from './move-ou-modal'

export function parentOuFromDn(dn: string): string {
  const idx = dn.indexOf(',')
  return idx >= 0 ? dn.slice(idx + 1).trim() : ''
}

export function dnMatch(a: string, b: string): boolean {
  return (a || '').toLowerCase().trim() === (b || '').toLowerCase().trim()
}

interface OuCardProps {
  user: ActiveDirectoryUser
  ous: OU[]
}

export function OuCard({ user: userRes, ous: ousRes }: OuCardProps) {
  if (!userRes) return null

  const currentOuDn = parentOuFromDn(userRes?.dn || '')

  const currentOuDisplay = ousRes.length
    ? ousRes.find((o) => dnMatch(o.dn, currentOuDn))?.ou ||
      ousRes.find((o) => dnMatch(o.dn, currentOuDn))?.name ||
      currentOuDn
    : currentOuDn

  const hasCurrent = currentOuDn && ousRes.some((o) => dnMatch(o.dn, currentOuDn))
  const ousForMove =
    currentOuDn && !hasCurrent
      ? [{ dn: currentOuDn, ou: currentOuDn, name: currentOuDn }, ...ousRes]
      : ousRes

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderTree className="size-4" />
          Unidade organizacional
        </CardTitle>
        <CardDescription>
          OU em que o usuário está atualmente. Use &quot;Mover para outra OU&quot; para mudar de
          pasta sem desativar a conta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 rounded-md border bg-muted/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">OU atual</p>
            <p className="font-medium text-sm truncate" title={currentOuDn}>
              {currentOuDisplay || '—'}
            </p>
            {currentOuDn && currentOuDisplay !== currentOuDn && (
              <p className="text-xs text-muted-foreground truncate mt-0.5" title={currentOuDn}>
                {currentOuDn}
              </p>
            )}
          </div>
          <MoveOuModal
            userId={userRes.sAMAccountName}
            currentOuDn={currentOuDn}
            currentOuDisplay={currentOuDisplay}
            ousForMove={ousForMove}
          />
        </div>
      </CardContent>
    </Card>
  )
}
