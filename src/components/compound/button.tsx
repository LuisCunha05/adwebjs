import { IconManager } from '@compound/icon-manager'
import { BaseButton } from '@ui/button'
import type { IconNames } from '@ui/client-icon-manager'

import type * as React from 'react'
import { cn } from '@/lib/utils'

type IconType = IconNames | React.ReactNode

export interface ButtonProps extends React.ComponentProps<typeof BaseButton> {
  text?: string
  leftIcon?: IconType
  rightIcon?: IconType
  loading?: boolean
  loadingText?: string
  wrapperClassName?: string
}
const RenderIcon = ({ icon }: { icon?: IconType }) => {
  if (!icon) return null
  if (typeof icon === 'string') {
    return <IconManager name={icon as IconNames} />
  }
  return icon
}

const Button = ({
  text,
  leftIcon,
  rightIcon,
  loading,
  loadingText,
  children,
  disabled,
  wrapperClassName,
  ...props
}: ButtonProps) => {
  const content = loading && loadingText ? loadingText : text || children

  return (
    <BaseButton disabled={loading || disabled} {...props}>
      <div className={cn('flex items-center gap-2', wrapperClassName)}>
        <RenderIcon icon={leftIcon} />
        {content}
        <RenderIcon icon={loading ? 'spinner' : rightIcon} />
      </div>
    </BaseButton>
  )
}

Button.displayName = 'Button'

export { Button }
