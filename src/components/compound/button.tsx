import { IconManager, type IconNames } from '@compound/icon-manager'
import { Button as UIButton } from '@ui/button'
import type * as React from 'react'

type IconType = IconNames | React.ReactNode

export interface ButtonProps extends React.ComponentProps<typeof UIButton> {
  text?: string
  leftIcon?: IconType
  rightIcon?: IconType
  loading?: boolean
  loadingText?: string
}

const Button = ({
  text,
  leftIcon,
  rightIcon,
  loading,
  loadingText,
  children,
  disabled,
  ...props
}: ButtonProps) => {
  const renderIcon = (icon: IconType) => {
    if (typeof icon === 'string') {
      return <IconManager name={icon as IconNames} />
    }
    return icon
  }

  const content = loading && loadingText ? loadingText : text || children

  return (
    <UIButton disabled={loading || disabled} {...props}>
      {leftIcon && renderIcon(leftIcon)}
      {content}
      {loading ? <IconManager name="spinner" /> : rightIcon && renderIcon(rightIcon)}
    </UIButton>
  )
}

Button.displayName = 'Button'

export { Button }
