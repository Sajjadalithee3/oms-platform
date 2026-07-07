import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authConfig } from "@/auth.config"

const { auth } = NextAuth(authConfig)

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

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
    if (session?.user) {
      const dashboard = roleDashboardMap[session.user.role as string] || "/login"
      return NextResponse.redirect(new URL(dashboard, req.url))
    }
    return NextResponse.next()
  }

  if (pathname === "/") {
    if (session?.user) {
      const dashboard = roleDashboardMap[session.user.role as string] || "/login"
      return NextResponse.redirect(new URL(dashboard, req.url))
    }
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const role = session.user.role as string
  const isAdmin = role === "SUPER_ADMIN" || role === "INTERNAL_STAFF"
  const isImpersonating = req.cookies.get("impersonate_user_id")?.value

  for (const [routePrefix, allowedRoles] of Object.entries(roleRouteMap)) {
    if (pathname.startsWith(routePrefix)) {
      if (isAdmin && isImpersonating) break
      if (!allowedRoles.includes(role)) {
        const dashboard = roleDashboardMap[role] || "/login"
        return NextResponse.redirect(new URL(dashboard, req.url))
      }
      break
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
