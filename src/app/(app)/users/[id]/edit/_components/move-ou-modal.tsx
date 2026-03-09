import { FolderTree } from 'lucide-react'
import { Modal } from '@/components/compound/modal'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function dnMatch(a: string, b: string): boolean {
  return (a || '').toLowerCase().trim() === (b || '').toLowerCase().trim()
}

interface MoveOuModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentOuDn: string
  currentOuDisplay: string
  moveOuTarget: string
  setMoveOuTarget: (val: string) => void
  ousForMove: { dn: string; ou?: string; name?: string }[]
  handleConfirm: () => void
  isPendingMove: boolean
}

export function MoveOuModal({
  open,
  onOpenChange,
  currentOuDn,
  currentOuDisplay,
  moveOuTarget,
  setMoveOuTarget,
  ousForMove,
  handleConfirm,
  isPendingMove,
}: MoveOuModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-md"
      title={
        <span className="flex items-center gap-2">
          <FolderTree className="size-4" />
          Mover usuário para outra OU
        </span>
      }
      description="Escolha a unidade organizacional de destino. O usuário permanecerá ativo; apenas a localização no AD será alterada."
      handleConfirm={handleConfirm}
      confirmButtonProps={{
        disabled: !moveOuTarget.trim() || isPendingMove || dnMatch(moveOuTarget, currentOuDn),
        loading: isPendingMove,
        loadingText: 'Movendo…',
        text: 'Mover',
        leftIcon: isPendingMove ? undefined : 'arrow-right-left',
      }}
    >
      <div className="space-y-4 py-2">
        <div className="rounded-md border bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">OU atual</p>
          <p className="font-medium text-sm truncate" title={currentOuDn}>
            {currentOuDisplay || currentOuDn || '—'}
          </p>
        </div>
        <div className="space-y-2">
          <Label>Nova OU de destino</Label>
          <Select
            value={moveOuTarget || '__none__'}
            onValueChange={(v) => setMoveOuTarget(v === '__none__' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a OU" />
            </SelectTrigger>
            <SelectContent>
              {ousForMove.map((ou) => (
                <SelectItem key={ou.dn} value={ou.dn} title={ou.dn}>
                  {ou.ou ?? ou.name ?? ou.dn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            A conta não será desativada. Para desativar e mover ao mesmo tempo, use
            &quot;Desativar conta&quot; nas ações rápidas.
          </p>
        </div>
      </div>
    </Modal>
  )
}
