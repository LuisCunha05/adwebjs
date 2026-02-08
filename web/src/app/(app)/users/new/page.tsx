import { listOUs } from "@/app/actions/ous";
import { NewUserForm } from "./new-user-form";

export default async function NewUserPage() {
  const ousRes = await listOUs();
  const ous = ousRes.ok && ousRes.data ? ousRes.data : [];

  return <NewUserForm ous={ous} />;
}
