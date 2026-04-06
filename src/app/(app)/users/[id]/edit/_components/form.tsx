'use client'

import { Button } from '@compound/button'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { EditAttribute } from '@/types/ldap'
import { useUserModel } from '../model'
import { AttributesCard } from './attributes-card'
import { GroupsCard } from './groups-card'
import { OuCard } from './ou-card'
import { QuickActionsCard } from './quick-actions-card'
import { Suspense } from 'react'

interface UserEditFormProps {
  initialUser: any
  editConfig: { fetch: string[]; edit: EditAttribute[] }
  ous: { dn: string; ou?: string; name?: string }[]
  children?: React.ReactNode
}

export function UserEditForm({ initialUser, editConfig, ous, children }: UserEditFormProps) {
  const model = useUserModel({ initialUser, editConfig })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" leftIcon="arrow-left" asChild>
          <Link href="/users">
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            {model.user.sAMAccountName}
            {model.isDisabled ? (
              <Badge variant="destructive">Desativada</Badge>
            ) : (
              <Badge variant="secondary">Ativa</Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">
            Atributos e ações do usuário no Active Directory.
          </p>
        </div>
      </div>

      <QuickActionsCard
        id={model.user.sAMAccountName}
        isDisabled={model.isDisabled}
        canDelete={model.canDelete}
        ous={ous}
        userAccountName={model.user.sAMAccountName}
      />

      <Suspense fallback={<div className="h-40 bg-muted/20 animate-pulse rounded-xl" />}>
        {children}
      </Suspense>

      <AttributesCard
        user={model.user}
        sections={model.sections}
        submitAction={model.submitAction}
        isSaving={model.isSaving}
        isDisabled={model.isDisabled}
        isPwdNeverExpires={model.isPwdNeverExpires}
      />

      <GroupsCard
        memberOfList={model.memberOfList}
        handleRemoveFromGroup={model.handleRemoveFromGroup}
        isPendingGroupRemove={model.isPendingGroupRemove}
        removingGroupId={model.removingGroupId}
      />
    </div>
  )
}
