"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"

interface Message {
  id: string
  content: string
  senderId: string
  createdAt: string
  isRead: boolean
  sender: { name: string | null; role: string }
}

interface MessageThreadProps {
  applicationId: string
  currentUserId: string
  readOnly?: boolean
}

export function MessageThread({ applicationId, currentUserId, readOnly }: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadMessages()
    const interval = setInterval(loadMessages, 10000)
    return () => clearInterval(interval)
  }, [applicationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function loadMessages() {
    const res = await fetch(`/api/messages/${applicationId}`)
    if (res.ok) setMessages(await res.json())
  }

  async function sendMessage() {
    if (!input.trim() || sending) return
    setSending(true)
    const res = await fetch(`/api/messages/${applicationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: input }),
    })
    if (res.ok) {
      setInput("")
      loadMessages()
    }
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full">
      {readOnly && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-700">
          Read only — you are viewing as provider
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[400px]">
        {messages.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No messages yet</p>}
        {messages.map((msg) => {
          const isOwn = msg.senderId === currentUserId
          return (
            <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] rounded-lg px-3 py-2 ${isOwn ? "bg-primary text-white" : "bg-gray-100 text-gray-900"}`}>
                <p className={`text-xs font-medium mb-1 ${isOwn ? "text-white/70" : "text-gray-500"}`}>
                  {msg.sender.name || "User"}
                </p>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-xs mt-1 ${isOwn ? "text-white/50" : "text-gray-400"}`}>
                  {new Date(msg.createdAt).toLocaleString()}
                  {isOwn && msg.isRead && " · Read"}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      {!readOnly && (
        <div className="border-t p-3 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Type a message..."
            disabled={sending}
          />
          <Button onClick={sendMessage} disabled={sending || !input.trim()} size="sm">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
