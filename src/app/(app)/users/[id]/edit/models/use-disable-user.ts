import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { disableUser } from '@/actions/users'

export function useDisableUser(id: string | undefined) {
  const router = useRouter()
  const [isPendingDisable, startDisable] = useTransition()
  const [disableDialogOpen, setDisableDialogOpen] = useState(false)
  const [disableTargetOu, setDisableTargetOu] = useState('')

  function openDisableDialog() {
    setDisableTargetOu('')
    setDisableDialogOpen(true)
  }

  function handleDisablePermanent() {
    startDisable(async () => {
      if (!id) return
      const res = await disableUser(id, disableTargetOu || undefined)
      if (!res.ok) {
        toast.error('Erro ao desativar usuário')
        return
      }

      toast.success(
        disableTargetOu
          ? 'Conta desativada e usuário movido para a OU informada.'
          : 'Conta desativada.',
      )
      setDisableDialogOpen(false)
      router.refresh()
    })
  }

  return {
    isPendingDisable,
    disableDialogOpen,
    setDisableDialogOpen,
    disableTargetOu,
    setDisableTargetOu,
    openDisableDialog,
    handleDisablePermanent,
  }
}
