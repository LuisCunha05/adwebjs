import { listOusCached } from '@/queries/ldap'
import { NewUserForm } from './new-user-form'

export default async function NewUserPage() {
  const ousRes = await listOusCached()
  const ous = ousRes.ok && ousRes.value ? ousRes.value : []

  return <NewUserForm ous={ous} />
}
