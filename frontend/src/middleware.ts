import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_COOKIE = "edubase_access";

type Role = "admin" | "mentor" | "student" | "parent";

function homeForRole(role: Role | undefined): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "mentor":
      return "/mentor/dashboard";
    case "student":
      return "/student/dashboard";
    default:
      return "/login";
  }
}

/** Decode the role from a JWT without verifying (verification happens server-side). */
function roleFromToken(token: string | undefined): Role | undefined {
  if (!token) return undefined;
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(
      Buffer.from(payload, "base64").toString("utf-8"),
    );
    return json.role as Role;
  } catch {
    return undefined;
  }
}

const PROTECTED_PREFIXES = ["/admin", "/mentor", "/student"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  const role = roleFromToken(token);
  const isAuthed = Boolean(token);

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  // Unauthenticated users cannot reach protected areas.
  if (isProtected && !isAuthed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated users on the login page or root go to their dashboard.
  if (isAuthed && (pathname === "/login" || pathname === "/")) {
    const url = req.nextUrl.clone();
    url.pathname = homeForRole(role);
    return NextResponse.redirect(url);
  }

  // Unauthenticated root -> login.
  if (!isAuthed && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Role isolation: keep each role within its own area.
  if (isAuthed && role) {
    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL(homeForRole(role), req.url));
    }
    if (pathname.startsWith("/mentor") && role !== "mentor") {
      return NextResponse.redirect(new URL(homeForRole(role), req.url));
    }
    if (pathname.startsWith("/student") && role !== "student") {
      return NextResponse.redirect(new URL(homeForRole(role), req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/admin/:path*", "/mentor/:path*", "/student/:path*"],
};
