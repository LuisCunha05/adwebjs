import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, SESSION_EXPIRATION_SECONDS } from "@/constants/config";
import type { Session } from "@/types/session";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET_KEY);

const ALGORITHM = "HS256";

interface Payload {
  session: Session;
  expiresAt: Date;
}

export async function createSession(session: Session) {
  const cookieStore = await cookies();
  const expires = new Date(Date.now() + SESSION_EXPIRATION_SECONDS * 1000);

  const jwtToken = await createJwtToken({ session, expiresAt: expires });
  cookieStore.set(SESSION_COOKIE_NAME, jwtToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires,
    sameSite: "strict",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const val = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!val) return null;

  const payload = await verifyJwtToken(val);

  if (!payload) return null;

  return payload.session;
}

export async function verifySession() {
  const isAuthenticated = await getSession();
  if (!isAuthenticated) redirect("/login");
}

const createJwtToken = async (payload: Payload) => {
  return new SignJWT({
    session: payload.session,
    expiresAt: payload.expiresAt.toISOString(),
  })
    .setProtectedHeader({ alg: ALGORITHM, typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(payload.expiresAt)
    .sign(SECRET);
};

export const verifyJwtToken = async (token: string | undefined = "") => {
  try {
    const { payload } = await jwtVerify<Payload>(token, SECRET, {
      algorithms: [ALGORITHM],
    });
    return payload;
  } catch {
    return null;
  }
};
