import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteAction } from './quick-actions/delete-action'
import { DisableAction } from './quick-actions/disable-action'
import { EnableAction } from './quick-actions/enable-action'
import { ResetPasswordAction } from './quick-actions/reset-password-action'
import { UnlockAction } from './quick-actions/unlock-action'

interface QuickActionsCardProps {
  id: string | undefined
  isDisabled: boolean
  canDelete: boolean
  ous: { dn: string; ou?: string; name?: string }[]
  userAccountName?: string
}

export function QuickActionsCard({
  id,
  isDisabled,
  canDelete,
  ous,
  userAccountName,
}: QuickActionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ações rápidas</CardTitle>
        <CardDescription>Ativar, desativar ou desbloquear a conta.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {isDisabled ? (
          <EnableAction id={id} />
        ) : (
          <DisableAction id={id} ous={ous} />
        )}
        <UnlockAction id={id} />
        <ResetPasswordAction id={id} />
        {canDelete && (
          <DeleteAction id={id} canDelete={canDelete} userAccountName={userAccountName} />
        )}
      </CardContent>
    </Card>
  )
}
