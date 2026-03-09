import { Button } from '@compound/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface QuickActionsCardProps {
  isDisabled: boolean
  isPendingEnable: boolean
  isPendingDisable: boolean
  isPendingUnlock: boolean
  isPendingReset: boolean
  isPendingDelete: boolean
  handleEnable: () => void
  openDisableDialog: () => void
  handleUnlock: () => void
  openResetPassword: () => void
  openDeleteDialog: () => void
  canDelete: boolean
}

export function QuickActionsCard({
  isDisabled,
  isPendingEnable,
  isPendingDisable,
  isPendingUnlock,
  isPendingReset,
  isPendingDelete,
  handleEnable,
  openDisableDialog,
  handleUnlock,
  openResetPassword,
  openDeleteDialog,
  canDelete,
}: QuickActionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ações rápidas</CardTitle>
        <CardDescription>Ativar, desativar ou desbloquear a conta.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {isDisabled ? (
          <Button
            variant="default"
            size="sm"
            onClick={handleEnable}
            disabled={isPendingEnable}
            loading={isPendingEnable}
            leftIcon="user-check"
            text="Ativar conta"
          />
        ) : (
          <Button
            variant="destructive"
            size="sm"
            onClick={openDisableDialog}
            disabled={isPendingDisable}
            leftIcon="user-x"
            text="Desativar conta"
          />
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleUnlock}
          disabled={isPendingUnlock}
          loading={isPendingUnlock}
          leftIcon="unlock"
          text="Desbloquear conta"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={openResetPassword}
          disabled={isPendingReset}
          loading={isPendingReset}
          leftIcon="key-round"
          text="Redefinir senha"
        />
        {canDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={openDeleteDialog}
            disabled={isPendingDelete}
            loading={isPendingDelete}
            leftIcon="trash-2"
            text="Excluir usuário"
          />
        )}
      </CardContent>
    </Card>
  )
}
