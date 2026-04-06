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
      try {
        const res = await enableUser(id)
        if (!res.ok) throw new Error(res.error)

        toast.success('Conta ativada.')
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || 'Falha ao ativar.')
      }
    })
  }

  return {
    isPendingEnable,
    handleEnable,
  }
}
