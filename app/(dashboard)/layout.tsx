import { redirect } from "next/navigation"
import { getEffectiveSession } from "@/lib/impersonate"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { ImpersonationBanner } from "@/components/dashboard/ImpersonationBanner"
import { PasswordResetPrompt } from "@/components/dashboard/PasswordResetPrompt"
import { AdBanner } from "@/components/shared/AdBanner"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const result = await getEffectiveSession()

  if (!result?.session?.user) {
    redirect("/login")
  }

  const { session, impersonating, realUser } = result

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar role={session.user.role} userName={session.user.name || ""} />
      <PasswordResetPrompt mustChangePassword={session.user.mustChangePassword} />
      <main className="flex-1 flex flex-col min-h-screen">
        {impersonating && realUser && (
          <ImpersonationBanner
            realUserName={realUser.name || "Admin"}
            viewingAs={session.user.name || ""}
            viewingRole={session.user.role}
          />
        )}
        <div className="px-6 pt-4">
          <AdBanner />
        </div>
        {children}
      </main>
    </div>
  )
}
