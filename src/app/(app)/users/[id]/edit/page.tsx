import { notFound } from 'next/navigation'
import { getUserAttributesConfig } from '@/actions/config'
import { listOUs } from '@/actions/ous'
import { getUser } from '@/actions/users'
import { verifySession } from '@/utils/manage-jwt'
import { UserEditForm } from './_components/form'

export default async function UserEditPage(props: { params: Promise<{ id: string }> }) {
  await verifySession()
  const params = await props.params

  const id = decodeURIComponent(params.id)

  // Parallel fetch for data
  const [userRes, configRes, ousRes] = await Promise.all([
    getUser(id),
    getUserAttributesConfig(),
    listOUs(),
  ])

  if (!userRes.ok || !userRes.data) {
    notFound()
  }

  // Use empty defaults if config/ous fail
  const editConfig = configRes.ok && configRes.data ? configRes.data : { fetch: [], edit: [] }
  const ous = ousRes.ok && ousRes.data ? ousRes.data : []

  return <UserEditForm initialUser={userRes.data} editConfig={editConfig} ous={ous} />
}
