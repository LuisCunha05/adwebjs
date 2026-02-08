import { notFound } from "next/navigation";
import { getUser } from "@/app/actions/users";
import { getUserAttributesConfig } from "@/app/actions/config";
import { listOUs } from "@/app/actions/ous";
import { UserEditForm } from "./user-edit-form";

export default async function UserEditPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params; // Await params in case Next.js version requires it, though usually direct access in 14. 
  // Next 15 requires awaiting params.

  const id = decodeURIComponent(params.id);

  // Parallel fetch for data
  const [userRes, configRes, ousRes] = await Promise.all([
    getUser(id),
    getUserAttributesConfig(),
    listOUs(),
  ]);

  if (!userRes.ok || !userRes.data) {
    notFound();
  }

  // Use empty defaults if config/ous fail
  const editConfig = configRes.ok && configRes.data ? configRes.data : { fetch: [], edit: [] };
  const ous = ousRes.ok && ousRes.data ? ousRes.data : [];

  return (
    <UserEditForm
      initialUser={userRes.data}
      editConfig={editConfig}
      ous={ous}
    />
  );
}
