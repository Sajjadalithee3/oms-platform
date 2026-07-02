"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Briefcase, GraduationCap, Building2, ArrowLeft, AlertCircle, UserPlus } from "lucide-react"

type SignupRole = "JOB_SEEKER" | "EMPLOYER" | "TRAINING_PROVIDER"

const roleCards: { role: SignupRole; title: string; description: string; icon: React.ReactNode }[] = [
  {
    role: "JOB_SEEKER",
    title: "Job Seeker",
    description: "Find your next role",
    icon: <Briefcase className="h-8 w-8" />,
  },
  {
    role: "EMPLOYER",
    title: "Employer",
    description: "Hire from funded talent pools",
    icon: <Building2 className="h-8 w-8" />,
  },
  {
    role: "TRAINING_PROVIDER",
    title: "Training Provider",
    description: "Manage your learners",
    icon: <GraduationCap className="h-8 w-8" />,
  },
]

const roleRedirects: Record<string, string> = {
  EMPLOYER: "/employer",
  JOB_SEEKER: "/jobseeker",
  TRAINING_PROVIDER: "/provider",
}

export default function SignupPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<SignupRole | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [companyName, setCompanyName] = useState("")
  const [industry, setIndustry] = useState("")
  const [companyLocation, setCompanyLocation] = useState("")

  const [organisationName, setOrganisationName] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactPhone, setContactPhone] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)

    const payload: Record<string, string> = {
      name,
      email,
      password,
      role: selectedRole!,
    }

    if (selectedRole === "EMPLOYER") {
      payload.companyName = companyName
      payload.industry = industry
      payload.location = companyLocation
    } else if (selectedRole === "TRAINING_PROVIDER") {
      payload.organisationName = organisationName
      payload.contactName = contactName || name
      payload.contactPhone = contactPhone
    }

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Signup failed")
      setLoading(false)
      return
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (signInResult?.error) {
      setError("Account created but auto-login failed. Please log in manually.")
      setLoading(false)
      return
    }

    router.push(roleRedirects[selectedRole!] || "/login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-2 pb-2">
          <h1 className="text-3xl font-bold text-primary">EdvanceFE</h1>
          <p className="text-gray-500 text-sm">Create your account</p>
        </CardHeader>
        <CardContent>
          {!selectedRole ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center mb-4">I want to join as a...</p>
              {roleCards.map((rc) => (
                <button
                  key={rc.role}
                  onClick={() => setSelectedRole(rc.role)}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="text-primary">{rc.icon}</div>
                  <div>
                    <p className="font-semibold text-[#1A1A2E]">{rc.title}</p>
                    <p className="text-sm text-gray-500">{rc.description}</p>
                  </div>
                </button>
              ))}
              <p className="text-center text-sm text-gray-500 mt-4">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedRole(null)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Change role
              </button>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="e.g. John Smith" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="e.g. john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>

              {selectedRole === "EMPLOYER" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input id="companyName" placeholder="e.g. Acme Ltd" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input id="industry" placeholder="e.g. Technology, Healthcare, Construction" value={industry} onChange={(e) => setIndustry(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyLocation">Location</Label>
                    <Input id="companyLocation" placeholder="e.g. London, Manchester, Remote" value={companyLocation} onChange={(e) => setCompanyLocation(e.target.value)} />
                  </div>
                </>
              )}

              {selectedRole === "TRAINING_PROVIDER" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="organisationName">Organisation Name</Label>
                    <Input id="organisationName" placeholder="e.g. Skills Academy UK" value={organisationName} onChange={(e) => setOrganisationName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact Name</Label>
                    <Input id="contactName" placeholder="e.g. Jane Doe" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Phone</Label>
                    <Input id="contactPhone" placeholder="e.g. 07700 900000" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                  </div>
                </>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  "Creating account..."
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create account
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
