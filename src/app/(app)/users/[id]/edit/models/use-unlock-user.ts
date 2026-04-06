import { useTransition } from 'react'
import { toast } from 'sonner'
import { unlockUser } from '@/actions/users'

export function useUnlockUser(id: string | undefined) {
  const [isPendingUnlock, startUnlock] = useTransition()

  function handleUnlock() {
    startUnlock(async () => {
      if (!id) return
      try {
        const res = await unlockUser(id)
        if (!res.ok) throw new Error(res.error)

        toast.success('Conta desbloqueada.')
      } catch (err: any) {
        toast.error(err.message || 'Falha ao desbloquear.')
      }
    })
  }

  return {
    isPendingUnlock,
    handleUnlock,
  }
}
