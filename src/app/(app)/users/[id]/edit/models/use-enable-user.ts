import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { enableUser } from '@/actions/users'

export function useEnableUser(id: string | undefined) {
  const router = useRouter()
  const [isPendingEnable, startEnable] = useTransition()

  function handleEnable() {
    startEnable(async () => {
      if (!id) return
      const res = await enableUser(id)
      if (!res.ok) {
        toast.error(res.error.message)
      }

      toast.success('Conta ativada.')
      router.refresh()
    })
  }

  return {
    isPendingEnable,
    handleEnable,
  }
}
