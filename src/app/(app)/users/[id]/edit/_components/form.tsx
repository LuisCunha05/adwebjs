'use client'

import { Button } from '@compound/button'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { EditAttribute } from '@/types/ldap'
import { useUserModel } from '../model'
import { AttributesCard } from './attributes-card'
import { DeleteUserModal } from './delete-user-modal'
import { DisableUserModal } from './disable-user-modal'
import { GroupsCard } from './groups-card'
import { MoveOuModal } from './move-ou-modal'
import { OuCard } from './ou-card'
import { QuickActionsCard } from './quick-actions-card'
import { ResetPasswordModal } from './reset-password-modal'

interface UserEditFormProps {
  initialUser: any
  editConfig: { fetch: string[]; edit: EditAttribute[] }
  ous: { dn: string; ou?: string; name?: string }[]
}

export function UserEditForm({ initialUser, editConfig, ous }: UserEditFormProps) {
  const model = useUserModel({ initialUser, editConfig, ous })

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
        isDisabled={model.isDisabled}
        isPendingEnable={model.isPendingEnable}
        isPendingDisable={model.isPendingDisable}
        isPendingUnlock={model.isPendingUnlock}
        isPendingReset={model.isPendingReset}
        isPendingDelete={model.isPendingDelete}
        handleEnable={model.handleEnable}
        openDisableDialog={model.openDisableDialog}
        handleUnlock={model.handleUnlock}
        openResetPassword={() => {
          model.setResetPwdValue('')
          model.setResetPwdOpen(true)
        }}
        openDeleteDialog={() => model.setDeleteDialogOpen(true)}
        canDelete={model.canDelete}
      />

      <OuCard
        currentOuDn={model.currentOuDn}
        currentOuDisplay={model.currentOuDisplay}
        openMoveOuDialog={model.openMoveOuDialog}
        isPendingMove={model.isPendingMove}
      />

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

      <DisableUserModal
        open={model.disableDialogOpen}
        onOpenChange={model.setDisableDialogOpen}
        ous={ous}
        disableTargetOu={model.disableTargetOu}
        setDisableTargetOu={model.setDisableTargetOu}
        handleConfirm={model.handleDisablePermanent}
        isPendingDisable={model.isPendingDisable}
      />

      <MoveOuModal
        open={model.moveOuDialogOpen}
        onOpenChange={model.setMoveOuDialogOpen}
        currentOuDn={model.currentOuDn}
        currentOuDisplay={model.currentOuDisplay}
        moveOuTarget={model.moveOuTarget}
        setMoveOuTarget={model.setMoveOuTarget}
        ousForMove={model.ousForMove}
        handleConfirm={model.handleMoveOu}
        isPendingMove={model.isPendingMove}
      />

      <ResetPasswordModal
        open={model.resetPwdOpen}
        onOpenChange={model.setResetPwdOpen}
        resetPwdValue={model.resetPwdValue}
        setResetPwdValue={model.setResetPwdValue}
        handleConfirm={model.handleResetPassword}
        isPendingReset={model.isPendingReset}
      />

      <DeleteUserModal
        open={model.deleteDialogOpen}
        onOpenChange={model.setDeleteDialogOpen}
        userAccountName={model.user?.sAMAccountName}
        handleConfirm={model.handleDelete}
        isPendingDelete={model.isPendingDelete}
      />
    </div>
  )
}
