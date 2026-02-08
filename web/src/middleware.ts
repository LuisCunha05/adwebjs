import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const session = request.cookies.get("adweb_session")?.value;
    const isLoginPage = request.nextUrl.pathname === "/login";
    const isPublicAsset = request.nextUrl.pathname.startsWith("/_next") ||
        request.nextUrl.pathname.startsWith("/static") ||
        request.nextUrl.pathname.includes("."); // primitive check for files

    if (isPublicAsset) return NextResponse.next();

    if (!session && !isLoginPage) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (session && isLoginPage) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
