'use client'
import { Loader2, type LucideProps } from 'lucide-react'
import dynamicIconImports from 'lucide-react/dynamicIconImports'
import dynamic from 'next/dynamic'
import { memo } from 'react'
import { cn } from '@/lib/utils'

type LucideIconNames = keyof typeof dynamicIconImports

export type IconNames = LucideIconNames | 'spinner'

export interface ClientIconManagerProps extends LucideProps {
  name: IconNames | 'spinner'
}

/**
 *  https://github.com/lucide-icons/lucide/issues/2081
 */
const icons = Object.keys(dynamicIconImports) as LucideIconNames[]

const icons_components = {} as Record<LucideIconNames, React.FC<LucideProps>>

for (const name of icons) {
  const NewIcon = dynamic(dynamicIconImports[name], {
    ssr: false,
  }) as React.FC<LucideProps>
  icons_components[name] = NewIcon
}

export const ClientIconManager = memo(
  ({ name, className, size = 16, ...props }: ClientIconManagerProps) => {
    if (name === 'spinner') {
      return <Loader2 size={size} className={cn('animate-spin', className)} {...props} />
    }

    const Icon = icons_components[name]

    if (!Icon) return null

    return <Icon size={size} className={className} {...props} />
  },
)

ClientIconManager.displayName = 'IconManager'
