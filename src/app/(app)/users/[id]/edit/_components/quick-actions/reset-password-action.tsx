'use client'

import { Button } from '@compound/button'
import { Modal } from '@/components/compound/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useResetPassword } from '../../models/use-reset-password'

interface ResetPasswordActionProps {
  id: string | undefined
}

export function ResetPasswordAction({ id }: ResetPasswordActionProps) {
  const model = useResetPassword(id)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={model.openResetPassword}
        disabled={model.isPendingReset}
        loading={model.isPendingReset}
        leftIcon="key-round"
        text="Redefinir senha"
      />

      <Modal
        open={model.resetPwdOpen}
        onOpenChange={model.setResetPwdOpen}
        title="Redefinir senha"
        description="Defina uma nova senha para este usuário. Ele precisará usá-la no próximo login."
        handleConfirm={model.handleResetPassword}
        confirmButtonProps={{
          disabled: !model.resetPwdValue.trim() || model.resetPwdValue.length < 8 || model.isPendingReset,
          loading: model.isPendingReset,
          text: 'Redefinir',
        }}
      >
        <div className="space-y-2 py-2">
          <Label htmlFor="newPassword">Nova senha</Label>
          <Input
            id="newPassword"
            type="password"
            value={model.resetPwdValue}
            onChange={(e) => model.setResetPwdValue(e.target.value)}
            placeholder="Mín. 8 caracteres"
            minLength={8}
          />
        </div>
      </Modal>
    </>
  )
}
