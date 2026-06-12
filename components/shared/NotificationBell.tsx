"use client"

import { useState, useEffect, useRef } from "react"
import { Bell } from "lucide-react"

interface Notification {
  id: string
  title: string
  body: string
  type: string
  isRead: boolean
  link: string | null
  createdAt: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unread = notifications.filter((n) => !n.isRead).length

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function loadNotifications() {
    const res = await fetch("/api/notifications")
    if (res.ok) setNotifications(await res.json())
  }

  async function markAllRead() {
    await fetch("/api/notifications/read", { method: "PUT" })
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })))
  }

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <Bell className="h-5 w-5 text-gray-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No notifications</p>}
            {notifications.slice(0, 20).map((n) => (
              <div key={n.id} className={`px-4 py-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer ${!n.isRead ? "bg-primary/5" : ""}`}
                onClick={() => { if (n.link) window.location.href = n.link }}>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
