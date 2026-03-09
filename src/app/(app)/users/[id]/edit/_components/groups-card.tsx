import { Button } from '@compound/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function cnFromDn(dn: string): string {
  const m = dn.match(/^CN=([^,]+)/i)
  return m ? m[1] : dn
}

interface GroupsCardProps {
  memberOfList: string[]
  handleRemoveFromGroup: (dn: string) => void
  isPendingGroupRemove: boolean
  removingGroupId: string | null
}

export function GroupsCard({
  memberOfList,
  handleRemoveFromGroup,
  isPendingGroupRemove,
  removingGroupId,
}: GroupsCardProps) {
  if (memberOfList.length === 0) return null

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Grupos</CardTitle>
        <CardDescription>
          Grupos dos quais este usuário é membro. Remover daqui não altera o grupo, apenas a
          associação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {memberOfList.map((dn: string) => {
            const cn = cnFromDn(dn)
            const loadingRm = isPendingGroupRemove && removingGroupId === cn
            return (
              <li key={dn} className="flex items-center justify-between rounded-lg border p-3">
                <span className="font-mono text-sm truncate flex-1" title={dn}>
                  {cn}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveFromGroup(dn)}
                  disabled={isPendingGroupRemove}
                  loading={loadingRm}
                  text="Remover do grupo"
                />
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
