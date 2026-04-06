'use client'

import { Button } from '@compound/button'
import { useEnableUser } from '../../models/use-enable-user'

interface EnableActionProps {
  id: string | undefined
}

export function EnableAction({ id }: EnableActionProps) {
  const model = useEnableUser(id)

  return (
    <Button
      variant="default"
      size="sm"
      onClick={model.handleEnable}
      disabled={model.isPendingEnable}
      loading={model.isPendingEnable}
      leftIcon="user-check"
      text="Ativar conta"
    />
  )
}
