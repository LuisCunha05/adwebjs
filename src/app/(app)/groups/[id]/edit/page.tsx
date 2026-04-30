import { notFound } from 'next/navigation'
import { groupService, userService } from '@/services/container'
import { GroupEditForm } from './group-edit-form'

export default async function GroupEditPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const id = decodeURIComponent(params.id)

  const [groupRes, membersRes] = await Promise.all([
    groupService.get(id),
    userService.search(' ', 'dn'),
  ])

  if (!groupRes.ok) {
    notFound()
  }

  const resolvedMembers = membersRes.ok && membersRes.ok ? membersRes.value : []

  return <GroupEditForm group={groupRes.value} initialResolvedMembers={resolvedMembers} />
}
