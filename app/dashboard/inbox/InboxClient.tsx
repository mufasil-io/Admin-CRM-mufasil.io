'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Send, Loader2, CheckCircle2, XCircle, Clock,
  MessageCircle, Shield, User, ChevronDown, ImageIcon, Search, Inbox
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Chat {
  id: string
  user_id: string
  status: string
  created_at: string
  updated_at: string
}

interface Message {
  id: string
  chat_id: string
  sender_type: 'user' | 'admin'
  text_content: string | null
  image_url: string | null
  created_at: string
}

interface UserProfile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  plan_tier: string | null
  business_name: string | null
}

const statusStyles: Record<string, { icon: typeof Clock; label: string; color: string; bg: string }> = {
  pending: { icon: Clock, label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-100' },
  approved: { icon: CheckCircle2, label: 'Approved', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  rejected: { icon: XCircle, label: 'Rejected', color: 'text-red-500', bg: 'bg-red-100' },
  closed: { icon: CheckCircle2, label: 'Closed', color: 'text-gray-500', bg: 'bg-gray-100' },
}

export default function InboxClient() {
  const [chats, setChats] = useState<Chat[]>([])
  const [profileMap, setProfileMap] = useState<Record<string, UserProfile>>({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [latestMsgMap, setLatestMsgMap] = useState<Record<string, any>>({})
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showActions, setShowActions] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('pro')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Fetch all chats
  useEffect(() => {
    const fetchChats = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/upgrade-inbox')
        const data = await res.json()
        if (res.ok) {
          setChats(data.chats || [])
          setProfileMap(data.profileMap || {})
          setLatestMsgMap(data.latestMsgMap || {})
        }
      } catch {
        toast.error('Failed to load inbox')
      } finally {
        setLoading(false)
      }
    }
    fetchChats()
  }, [])

  // Fetch messages when selecting a chat
  const selectChat = async (chat: Chat) => {
    setSelectedChat(chat)
    setLoadingMsgs(true)
    setShowActions(false)
    try {
      const res = await fetch('/api/admin/upgrade-inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_messages', chat_id: chat.id }),
      })
      const data = await res.json()
      setMessages(data.messages || [])
    } catch {
      toast.error('Failed to load messages')
    } finally {
      setLoadingMsgs(false)
    }
  }

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  // Poll for new messages every 5s
  useEffect(() => {
    if (!selectedChat) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/upgrade-inbox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_messages', chat_id: selectedChat.id }),
        })
        const data = await res.json()
        if (data.messages?.length > messages.length) {
          setMessages(data.messages)
        }
      } catch { /* silent */ }
    }, 5000)
    return () => clearInterval(interval)
  }, [selectedChat, messages.length])

  // Send admin message
  const sendMessage = async () => {
    if (!inputText.trim() || !selectedChat) return
    const text = inputText.trim()
    setInputText('')
    setSending(true)
    try {
      await fetch('/api/admin/upgrade-inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_message', chat_id: selectedChat.id, text_content: text }),
      })
      // Refetch
      const res = await fetch('/api/admin/upgrade-inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_messages', chat_id: selectedChat.id }),
      })
      const data = await res.json()
      setMessages(data.messages || [])
    } catch {
      toast.error('Failed to send')
      setInputText(text)
    } finally {
      setSending(false)
    }
  }

  // Approve upgrade
  const handleApprove = async () => {
    if (!selectedChat) return
    try {
      const res = await fetch('/api/admin/upgrade-inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', chat_id: selectedChat.id, new_plan: selectedPlan }),
      })
      if (res.ok) {
        toast.success(`User upgraded to ${selectedPlan}!`)
        setSelectedChat({ ...selectedChat, status: 'approved' })
        setShowActions(false)
        // Refetch messages to show approval msg
        const msgRes = await fetch('/api/admin/upgrade-inbox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_messages', chat_id: selectedChat.id }),
        })
        const msgData = await msgRes.json()
        setMessages(msgData.messages || [])
        // Update chats list
        setChats(prev => prev.map(c => c.id === selectedChat.id ? { ...c, status: 'approved' } : c))
      }
    } catch {
      toast.error('Failed to approve')
    }
  }

  // Reject
  const handleReject = async () => {
    if (!selectedChat) return
    try {
      const res = await fetch('/api/admin/upgrade-inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', chat_id: selectedChat.id }),
      })
      if (res.ok) {
        toast.success('Request rejected')
        setSelectedChat({ ...selectedChat, status: 'rejected' })
        setShowActions(false)
        const msgRes = await fetch('/api/admin/upgrade-inbox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_messages', chat_id: selectedChat.id }),
        })
        const msgData = await msgRes.json()
        setMessages(msgData.messages || [])
        setChats(prev => prev.map(c => c.id === selectedChat.id ? { ...c, status: 'rejected' } : c))
      }
    } catch {
      toast.error('Failed to reject')
    }
  }

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (ts: string) => new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

  const filteredChats = chats.filter(c => {
    const profile = profileMap[c.user_id]
    const q = searchQuery.toLowerCase()
    if (!q) return true
    return (
      (profile?.full_name?.toLowerCase().includes(q)) ||
      (profile?.email?.toLowerCase().includes(q)) ||
      (profile?.business_name?.toLowerCase().includes(q))
    )
  })

  const pendingCount = chats.filter(c => c.status === 'pending').length

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-2xl border-b border-black/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#128c7e] to-[#075e54] rounded-xl flex items-center justify-center shadow-md">
              <Inbox size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#1d1d1f]">Upgrade Inbox</h1>
              <p className="text-xs text-[#86868b] font-medium">
                {pendingCount > 0 ? `${pendingCount} pending` : 'All caught up'} · {chats.length} total
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/5 transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Content: WhatsApp Web Layout */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-3xl border border-black/[0.06] overflow-hidden shadow-sm flex" style={{ height: 'calc(100vh - 140px)' }}>
          {/* Left Sidebar: Chat List */}
          <div className={`w-full md:w-[380px] border-r border-black/[0.06] flex flex-col shrink-0 ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
            {/* Search */}
            <div className="p-3 border-b border-black/[0.04]">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#f5f5f7] rounded-xl text-sm text-[#1d1d1f] placeholder:text-[#a1a1a6] outline-none focus:ring-2 focus:ring-[#128c7e]/20 transition-all"
                />
              </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 size={28} className="animate-spin text-[#128c7e]" />
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                  <MessageCircle size={32} className="text-[#d2d2d7] mb-3" />
                  <p className="text-sm text-[#86868b] font-medium">No upgrade requests yet</p>
                </div>
              ) : (
                filteredChats.map((chat) => {
                  const profile = profileMap[chat.user_id]
                  const latestMsg = latestMsgMap[chat.id]
                  const isSelected = selectedChat?.id === chat.id
                  const statusStyle = statusStyles[chat.status] || statusStyles.pending

                  return (
                    <div
                      key={chat.id}
                      onClick={() => selectChat(chat)}
                      className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer border-b border-black/[0.03] transition-colors ${
                        isSelected ? 'bg-[#128c7e]/[0.08]' : 'hover:bg-[#f5f5f7]'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0071e3]/20 to-[#5856d6]/20 flex items-center justify-center text-sm font-bold text-[#0071e3] shrink-0">
                        {(profile?.full_name || profile?.email || '?')[0].toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="font-bold text-[14px] text-[#1d1d1f] truncate">
                            {profile?.full_name || profile?.email?.split('@')[0] || 'Unknown'}
                          </p>
                          <span className="text-[11px] text-[#86868b] shrink-0 ml-2">
                            {formatDate(chat.updated_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[13px] text-[#86868b] truncate flex-1">
                            {latestMsg?.image_url && !latestMsg?.text_content ? '📷 Photo' :
                             latestMsg?.text_content?.slice(0, 40) || 'New chat'}
                          </p>
                          <span className={`ml-2 shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.color}`}>
                            {chat.status === 'pending' && '●'}
                            {statusStyle.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right: Chat View */}
          <div className={`flex-1 flex flex-col ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
            {!selectedChat ? (
              // Empty state
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                <div className="w-24 h-24 rounded-full bg-[#128c7e]/[0.08] flex items-center justify-center mb-6">
                  <Shield size={40} className="text-[#128c7e]" />
                </div>
                <h2 className="text-2xl font-bold text-[#1d1d1f] mb-2">Upgrade Inbox</h2>
                <p className="text-sm text-[#86868b] max-w-sm">
                  Select a chat from the sidebar to view payment proofs and manage plan upgrades.
                </p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="bg-[#f5f5f7] px-5 py-3.5 flex items-center justify-between border-b border-black/[0.06] shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedChat(null)}
                      className="md:hidden p-1.5 rounded-lg hover:bg-black/5 cursor-pointer"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0071e3]/20 to-[#5856d6]/20 flex items-center justify-center text-sm font-bold text-[#0071e3]">
                      {(profileMap[selectedChat.user_id]?.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-[14px] text-[#1d1d1f]">
                        {profileMap[selectedChat.user_id]?.full_name || 'Unknown User'}
                      </p>
                      <p className="text-[12px] text-[#86868b]">
                        {profileMap[selectedChat.user_id]?.email}
                        {profileMap[selectedChat.user_id]?.plan_tier && (
                          <span className="ml-2 capitalize">
                            · Current: <strong>{profileMap[selectedChat.user_id]?.plan_tier}</strong>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {selectedChat.status === 'pending' && (
                    <div className="relative">
                      <button
                        onClick={() => setShowActions(!showActions)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-[#128c7e] text-white hover:bg-[#075e54] transition-colors cursor-pointer"
                      >
                        Quick Actions <ChevronDown size={14} />
                      </button>

                      {showActions && (
                        <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-2xl border border-black/10 p-4 z-10" style={{ animation: 'slideUp 0.2s ease' }}>
                          <p className="text-xs font-bold text-[#86868b] uppercase tracking-wider mb-3">Upgrade Plan</p>
                          
                          <div className="flex gap-2 mb-4">
                            {['starter', 'pro', 'enterprise'].map(p => (
                              <button
                                key={p}
                                onClick={() => setSelectedPlan(p)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                                  selectedPlan === p
                                    ? 'bg-[#128c7e] text-white shadow-md'
                                    : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={handleApprove}
                              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-b from-[#28cd41] to-[#1fa834] text-white shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={handleReject}
                              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-b from-[#ff3b30] to-[#e0342a] text-white shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                              ❌ Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedChat.status !== 'pending' && (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${statusStyles[selectedChat.status]?.bg} ${statusStyles[selectedChat.status]?.color}`}>
                      {statusStyles[selectedChat.status]?.label || selectedChat.status}
                    </span>
                  )}
                </div>

                {/* Messages */}
                <div
                  className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                  style={{ background: '#e5ddd5 url("data:image/svg+xml,%3Csvg width=\'400\' height=\'400\' viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23d4cec5\' fill-opacity=\'0.3\'%3E%3Ccircle cx=\'100\' cy=\'100\' r=\'3\'/%3E%3Ccircle cx=\'200\' cy=\'200\' r=\'3\'/%3E%3Ccircle cx=\'300\' cy=\'300\' r=\'3\'/%3E%3Ccircle cx=\'50\' cy=\'250\' r=\'2\'/%3E%3Ccircle cx=\'350\' cy=\'50\' r=\'2\'/%3E%3C/g%3E%3C/svg%3E")' }}
                >
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 size={28} className="animate-spin text-[#128c7e]" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-sm text-[#86868b]">No messages yet</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                            msg.sender_type === 'admin'
                              ? 'bg-[#dcf8c6] rounded-tr-sm'
                              : 'bg-white rounded-tl-sm'
                          }`}
                        >
                          {/* Sender label */}
                          <p className={`text-[11px] font-bold mb-1 ${
                            msg.sender_type === 'admin' ? 'text-[#128c7e]' : 'text-[#6b5ce7]'
                          }`}>
                            {msg.sender_type === 'admin' ? 'You (Admin)' : profileMap[selectedChat.user_id]?.full_name || 'User'}
                          </p>

                          {msg.image_url && (
                            <a href={msg.image_url} target="_blank" rel="noopener noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={msg.image_url}
                                alt="Attachment"
                                className="w-full max-w-[250px] rounded-xl mb-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                              />
                            </a>
                          )}
                          {msg.text_content && (
                            <p className="text-[14px] text-[#1d1d1f] whitespace-pre-wrap leading-relaxed">
                              {msg.text_content}
                            </p>
                          )}
                          <p className="text-[10px] text-[#86868b] text-right mt-1">
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <div className="bg-[#f0f0f0] px-4 py-3 flex items-center gap-3 shrink-0 border-t border-black/5">
                  <div className="flex-1 bg-white rounded-3xl border border-black/10 px-4 py-2.5">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder="Type a message as admin..."
                      className="w-full text-[14px] text-[#1d1d1f] placeholder:text-[#a1a1a6] outline-none bg-transparent"
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!inputText.trim() || sending}
                    className="w-10 h-10 rounded-full bg-[#128c7e] flex items-center justify-center text-white hover:bg-[#075e54] transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
