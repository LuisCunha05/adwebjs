import { useTransition } from 'react'
import { toast } from 'sonner'
import { unlockUser } from '@/actions/users'

export function useUnlockUser(id: string | undefined) {
  const [isPendingUnlock, startUnlock] = useTransition()

  function handleUnlock() {
    startUnlock(async () => {
      if (!id) return

      const res = await unlockUser(id)

      if (!res.ok) {
        toast.error(res.error.message)
        return
      }

      toast.success('Conta desbloqueada.')

    })
  }

  return {
    isPendingUnlock,
    handleUnlock,
  }
}
