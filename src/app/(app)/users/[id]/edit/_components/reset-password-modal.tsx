import { Modal } from '@/components/compound/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ResetPasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resetPwdValue: string
  setResetPwdValue: (val: string) => void
  handleConfirm: () => void
  isPendingReset: boolean
}

export function ResetPasswordModal({
  open,
  onOpenChange,
  resetPwdValue,
  setResetPwdValue,
  handleConfirm,
  isPendingReset,
}: ResetPasswordModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Redefinir senha"
      description="Defina uma nova senha para este usuário. Ele precisará usá-la no próximo login."
      handleConfirm={handleConfirm}
      confirmButtonProps={{
        disabled: !resetPwdValue.trim() || resetPwdValue.length < 8 || isPendingReset,
        loading: isPendingReset,
        text: 'Redefinir',
      }}
    >
      <div className="space-y-2 py-2">
        <Label htmlFor="newPassword">Nova senha</Label>
        <Input
          id="newPassword"
          type="password"
          value={resetPwdValue}
          onChange={(e) => setResetPwdValue(e.target.value)}
          placeholder="Mín. 8 caracteres"
          minLength={8}
        />
      </div>
    </Modal>
  )
}
