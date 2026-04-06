import { verifySession } from '@/utils/manage-jwt'
import { NewUserForm } from './new-user-form'
import { ldapService } from '@/services/container'

export default async function NewUserPage() {
  await verifySession()
  const ousRes = await ldapService.listOUs()
  const ous = ousRes.ok && ousRes.data ? ousRes.data : []

  return <NewUserForm ous={ous} />
}
