import { notFound } from 'next/navigation'
import { groupService, userService } from '@/services/container'
import { GroupEditForm } from './group-edit-form'

export default async function GroupEditPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const id = decodeURIComponent(params.id)

  const [groupRes, membersRes] = await Promise.all([groupService.get(id), userService.listAll()])

  if (!groupRes.ok) {
    notFound()
  }

  const resolvedMembers = membersRes.ok
    ? membersRes.value.map((user) => {
        const { dn, cn, displayName, sAMAccountName } = user
        return { dn, cn, displayName, sAMAccountName }
      })
    : []

  return <GroupEditForm group={groupRes.value} initialResolvedMembers={resolvedMembers} />
}
