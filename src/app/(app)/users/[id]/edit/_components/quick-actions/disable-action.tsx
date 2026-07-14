'use client'

import { Button } from '@compound/button'
import { Modal } from '@/components/compound/modal'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDisableUser } from '../../models/use-disable-user'

interface DisableActionProps {
  id: string | undefined
  ous: { dn: string; ou?: string; name?: string }[]
}

export function DisableAction({ id, ous }: DisableActionProps) {
  const model = useDisableUser(id)

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={model.openDisableDialog}
        disabled={model.isPendingDisable}
        leftIcon="user-x"
        text="Desativar conta"
      />

      <Modal
        open={model.disableDialogOpen}
        onOpenChange={model.setDisableDialogOpen}
        title="Desativação permanente"
        description="Opcionalmente mova o usuário para outra OU após desativar (ex.: OU de desativados) ou mantenha no mesmo lugar."
        handleConfirm={model.handleDisablePermanent}
        confirmButtonProps={{
          variant: 'destructive',
          disabled: model.isPendingDisable,
          loading: model.isPendingDisable,
          loadingText: 'Desativando…',
          text: 'Desativar',
        }}
      >
        <div className="space-y-2 py-2">
          <Label>Destino após desativar</Label>
          <Select
            value={model.disableTargetOu || 'keep'}
            onValueChange={(v) => model.setDisableTargetOu(v === 'keep' ? '' : v)}
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
    </>
  )
}
