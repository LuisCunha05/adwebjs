'use client'

import { useState, useTransition } from 'react'
import { FolderTree } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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
import { moveUser } from '@/actions/users'

function dnMatch(a: string, b: string): boolean {
  return (a || '').toLowerCase().trim() === (b || '').toLowerCase().trim()
}

interface MoveOuModalProps {
  userId: string
  currentOuDn: string
  currentOuDisplay: string
  ousForMove: { dn: string; ou?: string; name?: string }[]
}

export function MoveOuModal({
  userId,
  currentOuDn,
  currentOuDisplay,
  ousForMove,
}: MoveOuModalProps) {
  const [open, setOpen] = useState(false)
  const [moveOuTarget, setMoveOuTarget] = useState('')
  const [isPendingMove, startMove] = useTransition()
  const router = useRouter()

  function handleConfirm() {
    startMove(async () => {
      if (!userId || !moveOuTarget.trim()) return
      if (dnMatch(moveOuTarget, currentOuDn)) {
        toast.info('O usuário já está nesta OU.')
        return
      }
      try {
        const res = await moveUser(userId, moveOuTarget.trim())
        if (!res.ok) throw new Error(res.error)

        toast.success('Usuário movido para a nova OU.')
        setOpen(false)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || 'Falha ao mover usuário.')
      }
    })
  }

  function handleOpenChange(newOpen: boolean) {
    if (newOpen) {
      setMoveOuTarget(currentOuDn)
    }
    setOpen(newOpen)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleOpenChange(true)}
        loading={isPendingMove}
        leftIcon="arrow-right-left"
        text="Mover para outra OU"
      />
      <Modal
        open={open}
        onOpenChange={handleOpenChange}
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
              A conta não será desativada. Para desativar e mover ao mesmo tempo, use &quot;Desativar
              conta&quot; nas ações rápidas.
            </p>
          </div>
        </div>
      </Modal>
    </>
  )
}
