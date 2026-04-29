import { notFound } from 'next/navigation'
import { getUserAttributesConfig } from '@/actions/config'
import { listOusCached, showUserCached } from '@/queries/ldap'
import { UserEditForm } from './_components/form'

export default async function UserEditPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params

  // Parallel fetch for data
  const [user, configRes, ous] = await Promise.all([
    showUserCached(id),
    getUserAttributesConfig(),
    listOusCached(),
  ])

  if (!user || !configRes || !ous.ok) {
    notFound()
  }

  // Use empty defaults if config/ous fail
  const editConfig = configRes.ok && configRes.data ? configRes.data : { fetch: [], edit: [] }

  return <UserEditForm initialUser={user} editConfig={editConfig} ous={ous.data} />
}
