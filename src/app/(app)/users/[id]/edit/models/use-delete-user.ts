import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { deleteUser } from '@/actions/users'

export function useDeleteUser(id: string | undefined) {
  const router = useRouter()
  const [isPendingDelete, startDelete] = useTransition()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  function handleDelete() {
    startDelete(async () => {
      if (!id) return
        const res = await deleteUser(id)
      if (!res.ok) {
        toast.error(res.error.message)
        return
      }

      toast.success('Usuário excluído.')
      setDeleteDialogOpen(false)
      router.replace('/users')
    })
  }

  return {
    isPendingDelete,
    deleteDialogOpen,
    setDeleteDialogOpen,
    openDeleteDialog: () => setDeleteDialogOpen(true),
    handleDelete,
  }
}
