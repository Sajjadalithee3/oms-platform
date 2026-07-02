"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function PasswordResetPrompt({ mustChangePassword }: { mustChangePassword: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(mustChangePassword)

  const dismiss = async () => {
    setOpen(false)
    await fetch("/api/auth/password-prompt", { method: "PUT" })
  }

  const dismissAndReset = async () => {
    setOpen(false)
    await fetch("/api/auth/password-prompt", { method: "PUT" })
    router.push("/reset-password")
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) dismiss() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset your password?</DialogTitle>
          <DialogDescription>
            You&apos;re currently using a temporary password. Would you like to set a new one now?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={dismiss}>Not now</Button>
          <Button onClick={dismissAndReset}>Yes, reset it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
