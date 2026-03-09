import { Modal } from '@/components/compound/modal'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DisableUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ous: { dn: string; ou?: string; name?: string }[]
  disableTargetOu: string
  setDisableTargetOu: (val: string) => void
  handleConfirm: () => void
  isPendingDisable: boolean
}

export function DisableUserModal({
  open,
  onOpenChange,
  ous,
  disableTargetOu,
  setDisableTargetOu,
  handleConfirm,
  isPendingDisable,
}: DisableUserModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Desativação permanente"
      description="Opcionalmente mova o usuário para outra OU após desativar (ex.: OU de desativados) ou mantenha no mesmo lugar."
      handleConfirm={handleConfirm}
      confirmButtonProps={{
        variant: 'destructive',
        disabled: isPendingDisable,
        loading: isPendingDisable,
        loadingText: 'Desativando…',
        text: 'Desativar',
      }}
    >
      <div className="space-y-2 py-2">
        <Label>Destino após desativar</Label>
        <Select
          value={disableTargetOu || 'keep'}
          onValueChange={(v) => setDisableTargetOu(v === 'keep' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Manter no mesmo lugar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="keep">Manter no mesmo lugar</SelectItem>
            {ous.map((ou) => (
              <SelectItem key={ou.dn} value={ou.dn}>
                {ou.ou ?? ou.name ?? ou.dn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Modal>
  )
}
