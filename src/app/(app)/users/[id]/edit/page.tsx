import { notFound } from 'next/navigation'
import { getUserAttributesConfig } from '@/actions/config'
import { UserEditForm } from './_components/form'
import { OuCard } from './_components/ou-card'
import { ldapService } from '@/services/container'

export default async function UserEditPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params

  // Parallel fetch for data
  const [user, configRes, ous] = await Promise.all([
    ldapService.getUser(id),
    getUserAttributesConfig(),
    ldapService.listOUs()
  ])

  if (!user || !configRes || !ous.ok) {
    notFound()
  }

  // Use empty defaults if config/ous fail
  const editConfig = configRes.ok && configRes.data ? configRes.data : { fetch: [], edit: [] }

  return (
    <UserEditForm initialUser={user} editConfig={editConfig} ous={ous.data}>
      <OuCard userId={id} />
    </UserEditForm>
  )
}
