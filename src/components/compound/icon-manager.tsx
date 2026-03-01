import { Suspense } from 'react'
import { ClientIconManager, type ClientIconManagerProps } from '../ui/client-icon-manager'

export const IconManager = (props: ClientIconManagerProps) => {
  return (
    <Suspense>
      <ClientIconManager {...props} />
    </Suspense>
  )
}
