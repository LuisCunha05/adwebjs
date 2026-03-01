import { Loader2, type LucideProps } from 'lucide-react'
import dynamicIconImports from 'lucide-react/dynamicIconImports'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

export type IconNames = keyof typeof dynamicIconImports | 'spinner'

export interface IconManagerProps extends LucideProps {
  name: IconNames
}

export function IconManager({ name, className, size = 16, ...props }: IconManagerProps) {
  if (name === 'spinner') {
    return <Loader2 className={cn('animate-spin', className)} {...props} />
  }

  const iconName = name as keyof typeof dynamicIconImports
  const LucideIcon = dynamic(dynamicIconImports[iconName])

  return <LucideIcon size={size} className={className} {...props} />
}
