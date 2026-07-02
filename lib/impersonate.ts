import { cookies } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const COOKIE_NAME = "impersonate_user_id"

export async function getEffectiveSession() {
  const session = await auth()
  if (!session?.user) return null

  const isAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "INTERNAL_STAFF"
  if (!isAdmin) return { session, impersonating: false, realUser: null }

  const cookieStore = await cookies()
  const impersonateId = cookieStore.get(COOKIE_NAME)?.value

  if (!impersonateId) return { session, impersonating: false, realUser: null }

  const target = await prisma.user.findUnique({
    where: { id: impersonateId },
    select: { id: true, name: true, email: true, role: true },
  })

  if (!target) return { session, impersonating: false, realUser: null }

  const realUser = {
    id: session.user.id,
    name: session.user.name,
    role: session.user.role,
  }

  return {
    session: {
      ...session,
      user: {
        ...session.user,
        id: target.id,
        name: target.name || "",
        email: target.email,
        role: target.role,
      },
    },
    impersonating: true,
    realUser,
  }
}
