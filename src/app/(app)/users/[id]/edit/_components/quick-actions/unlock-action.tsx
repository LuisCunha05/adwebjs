'use client'

import { Button } from '@compound/button'
import { useUnlockUser } from '../../models/use-unlock-user'

interface UnlockActionProps {
  id: string | undefined
}

export function UnlockAction({ id }: UnlockActionProps) {
  const model = useUnlockUser(id)

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={model.handleUnlock}
      disabled={model.isPendingUnlock}
      loading={model.isPendingUnlock}
      leftIcon="unlock"
      text="Desbloquear conta"
    />
  )
}
