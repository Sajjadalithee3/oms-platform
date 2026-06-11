import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const roleRouteMap: Record<string, string[]> = {
  "/admin": ["SUPER_ADMIN"],
  "/staff": ["INTERNAL_STAFF", "SUPER_ADMIN"],
  "/provider": ["TRAINING_PROVIDER", "SUPER_ADMIN"],
  "/employer": ["EMPLOYER", "SUPER_ADMIN"],
  "/learner": ["LEARNER"],
  "/jobseeker": ["JOB_SEEKER"],
}

const roleDashboardMap: Record<string, string> = {
  SUPER_ADMIN: "/admin",
  INTERNAL_STAFF: "/staff",
  TRAINING_PROVIDER: "/provider",
  EMPLOYER: "/employer",
  LEARNER: "/learner",
  JOB_SEEKER: "/jobseeker",
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    if (token && (pathname.startsWith("/login") || pathname.startsWith("/signup"))) {
      const dashboard = roleDashboardMap[token.role as string] || "/login"
      return NextResponse.redirect(new URL(dashboard, request.url))
    }
    return NextResponse.next()
  }

  if (pathname === "/") {
    if (token) {
      const dashboard = roleDashboardMap[token.role as string] || "/login"
      return NextResponse.redirect(new URL(dashboard, request.url))
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  for (const [routePrefix, allowedRoles] of Object.entries(roleRouteMap)) {
    if (pathname.startsWith(routePrefix)) {
      if (!allowedRoles.includes(token.role as string)) {
        const dashboard = roleDashboardMap[token.role as string] || "/login"
        return NextResponse.redirect(new URL(dashboard, request.url))
      }
      break
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
