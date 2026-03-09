import { listOUs } from '@/actions/ous'
import { verifySession } from '@/utils/manage-jwt'
import { NewUserForm } from './new-user-form'

export default async function NewUserPage() {
  await verifySession()
  const ousRes = await listOUs()
  const ous = ousRes.ok && ousRes.data ? ousRes.data : []

  return <NewUserForm ous={ous} />
}
