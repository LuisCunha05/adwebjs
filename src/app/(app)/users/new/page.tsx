import { listOUs } from "@/actions/ous";
import { NewUserForm } from "./new-user-form";
import { verifySession } from "@/utils/manage-jwt";

export default async function NewUserPage() {
  await verifySession();
  const ousRes = await listOUs();
  const ous = ousRes.ok && ousRes.data ? ousRes.data : [];

  return <NewUserForm ous={ous} />;
}
