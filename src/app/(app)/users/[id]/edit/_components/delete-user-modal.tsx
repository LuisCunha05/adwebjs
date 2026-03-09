import { Modal } from '@/components/compound/modal'

interface DeleteUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userAccountName?: string
  handleConfirm: () => void
  isPendingDelete: boolean
}

export function DeleteUserModal({
  open,
  onOpenChange,
  userAccountName,
  handleConfirm,
  isPendingDelete,
}: DeleteUserModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Excluir usuário"
      description={`Esta ação não pode ser desfeita. O usuário "${userAccountName || ''}" será removido permanentemente do Active Directory.`}
      handleConfirm={handleConfirm}
      confirmButtonProps={{
        variant: 'destructive',
        disabled: isPendingDelete,
        loading: isPendingDelete,
        text: 'Excluir permanentemente',
      }}
    />
  )
}
