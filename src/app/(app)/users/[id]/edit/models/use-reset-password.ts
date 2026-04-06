import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { resetPassword } from '@/actions/users'

export function useResetPassword(id: string | undefined) {
  const [isPendingReset, startReset] = useTransition()
  const [resetPwdOpen, setResetPwdOpen] = useState(false)
  const [resetPwdValue, setResetPwdValue] = useState('')

  function openResetPassword() {
    setResetPwdValue('')
    setResetPwdOpen(true)
  }

  function handleResetPassword() {
    startReset(async () => {
      if (!id || !resetPwdValue.trim() || resetPwdValue.length < 8) return
      try {
        const res = await resetPassword(id, resetPwdValue)
        if (!res.ok) throw new Error(res.error)

        toast.success('Senha redefinida.')
        setResetPwdOpen(false)
        setResetPwdValue('')
      } catch (err: any) {
        toast.error(err.message || 'Falha ao redefinir senha.')
      }
    })
  }

  return {
    isPendingReset,
    resetPwdOpen,
    setResetPwdOpen,
    resetPwdValue,
    setResetPwdValue,
    openResetPassword,
    handleResetPassword,
  }
}
