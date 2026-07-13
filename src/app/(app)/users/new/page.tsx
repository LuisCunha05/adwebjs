import { ouService } from '@/services/container'
import { NewUserForm } from './new-user-form'

export default async function NewUserPage() {
  const ousRes = await ouService.listOUs()
  const ous = ousRes.ok && ousRes.value ? ousRes.value : []

  return <NewUserForm ous={ous} />
}
