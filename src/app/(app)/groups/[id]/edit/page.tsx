import { notFound } from "next/navigation";
import { getGroup, getGroupMembersResolved } from "@/actions/groups";
import { GroupEditForm } from "./group-edit-form";

export default async function GroupEditPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = decodeURIComponent(params.id);

  const [groupRes, membersRes] = await Promise.all([
    getGroup(id),
    getGroupMembersResolved(id),
  ]);

  if (!groupRes.ok || !groupRes.data) {
    notFound();
  }

  const resolvedMembers = membersRes.ok && membersRes.data ? membersRes.data : [];

  return (
    <GroupEditForm group={groupRes.data} initialResolvedMembers={resolvedMembers} />
  );
}
