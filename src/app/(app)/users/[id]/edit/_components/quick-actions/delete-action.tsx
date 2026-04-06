'use client'

import { Button } from '@compound/button'
import { Modal } from '@/components/compound/modal'
import { useDeleteUser } from '../../models/use-delete-user'

interface DeleteActionProps {
  id: string | undefined
  userAccountName?: string
  canDelete: boolean
}

export function DeleteAction({ id, userAccountName, canDelete }: DeleteActionProps) {
  const model = useDeleteUser(id)

  if (!canDelete) return null

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={model.openDeleteDialog}
        disabled={model.isPendingDelete}
        loading={model.isPendingDelete}
        leftIcon="trash-2"
        text="Excluir usuário"
      />

      <Modal
        open={model.deleteDialogOpen}
        onOpenChange={model.setDeleteDialogOpen}
        title="Excluir usuário"
        description={`Esta ação não pode ser desfeita. O usuário "${userAccountName || ''}" será removido permanentemente do Active Directory.`}
        handleConfirm={model.handleDelete}
        confirmButtonProps={{
          variant: 'destructive',
          disabled: model.isPendingDelete,
          loading: model.isPendingDelete,
          text: 'Excluir permanentemente',
        }}
      />
    </>
  )
}
