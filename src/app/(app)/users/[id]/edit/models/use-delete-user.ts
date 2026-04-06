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
      try {
        const res = await deleteUser(id)
        if (!res.ok) throw new Error(res.error)

        toast.success('Usuário excluído.')
        setDeleteDialogOpen(false)
        router.replace('/users')
      } catch (err: any) {
        toast.error(err.message || 'Falha ao excluir.')
      }
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
