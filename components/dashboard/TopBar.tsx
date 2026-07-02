"use client"

import { NotificationBell } from "@/components/shared/NotificationBell"

interface TopBarProps {
  title: string
  notificationCount?: number
}

export function TopBar({ title }: TopBarProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold text-[#1A1A2E] md:ml-0 ml-12">{title}</h1>
      <div className="flex items-center gap-4">
        <NotificationBell />
      </div>
    </header>
  )
}
