"use server";

import { ldapService } from "@/services/container";
import { type Session } from "@/types/session";
import { loginSchema } from "@/schemas/login";
import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/utils/manage-jwt";
import { LDAP_GROUP_DELETE } from "@/constants/config";

function getVal(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v.length > 0 ? String(v[0]) : undefined;
  return String(v);
}

export interface LoginState {
  username: string;
  error?: string;
}

export async function loginAction(state: LoginState, formData: FormData): Promise<LoginState> {
  try {
    const parsedData = loginSchema.safeParse({
      username: formData.get("username"),
      password: formData.get("password"),
    });

    if (!parsedData.success) {
      return {
        error: "Insira um nome de usuário(ou email) e senha",
        username: formData.get("username")?.toString() ?? "",
      };
    }

    const user = await ldapService.authenticate(parsedData.data.username, parsedData.data.password);

    console.log({ user, LDAP_GROUP_DELETE });
    const canDelete = Array.isArray(user.memberOf) && !!LDAP_GROUP_DELETE && user.memberOf.includes(LDAP_GROUP_DELETE);

    const session: Session = {
      user: {
        sAMAccountName: getVal(user.sAMAccountName) || parsedData.data.username,
        cn: getVal(user.cn),
        mail: getVal(user.mail),
        userPrincipalName: getVal(user.userPrincipalName),
        displayName: getVal(user.displayName),
      },
      isAdmin: true, // Authenticated users via ldap.authenticate are considered admins in this app context
      canDelete,
    };

    await createSession(session);
  } catch (err: unknown) {
    console.log("err", err);
    return { username: formData.get("username")?.toString() ?? "", error: "Credenciais inválidas ou erro de conexão" };
  }

  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
