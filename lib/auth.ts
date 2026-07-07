import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"
import { authConfig } from "@/auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.isActive) {
          return null
        }

        const isValid = await bcrypt.compare(credentials.password as string, user.password)
        if (!isValid) {
          return null
        }

        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

        return {
          id: user.id,
          email: user.email,
          name: user.name || "",
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        }
      },
    }),
  ],
})

export function getRoleRedirect(role: Role): string {
  const redirects: Record<Role, string> = {
    SUPER_ADMIN: "/admin",
    INTERNAL_STAFF: "/staff",
    TRAINING_PROVIDER: "/provider",
    EMPLOYER: "/employer",
    LEARNER: "/learner",
    JOB_SEEKER: "/jobseeker",
  }
  return redirects[role] || "/login"
}
