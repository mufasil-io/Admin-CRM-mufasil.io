'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Send, Loader2, MessageCircle, User, Users, Search
} from 'lucide-react'
import toast from 'react-hot-toast'

interface UserProfile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  plan_tier: string | null
  business_name: string | null
  created_at: string
}

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
  content: string | null
  image_url: string | null
  created_at: string
}

export default function UsersChatClient() {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [latestMsgMap, setLatestMsgMap] = useState<Record<string, any>>({})
  const [chatMap, setChatMap] = useState<Record<string, Chat>>({}) // user_id -> Chat

  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Fetch all users and chats once
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/users-chat')
        const data = await res.json()
        if (res.ok) {
          setProfiles(data.profiles || [])
          setLatestMsgMap(data.latestMsgMap || {})
          
          const cMap: Record<string, Chat> = {}
          data.chats?.forEach((c: Chat) => {
            cMap[c.user_id] = c
          })
          setChatMap(cMap)
        }
      } catch {
        toast.error('Failed to load users')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // View user & load chat
  const selectUser = async (profile: UserProfile) => {
    setSelectedProfile(profile)
    setLoadingMsgs(true)
    setMessages([])
    
    try {
      const res = await fetch('/api/admin/users-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_or_create_chat', user_id: profile.id }),
      })
      const data = await res.json()
      
      if (res.ok) {
        setSelectedChat(data.chat)
        setMessages(data.messages || [])
        // Update chat map
        setChatMap(prev => ({ ...prev, [profile.id]: data.chat }))
      }
    } catch {
      toast.error('Failed to load chat')
    } finally {
      setLoadingMsgs(false)
    }
  }

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  // Poll messages every 5s if a chat is active
  useEffect(() => {
    if (!selectedChat) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/users-chat', {
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
      await fetch('/api/admin/users-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_message', chat_id: selectedChat.id, text_content: text }),
      })
      
      // Optimitically append
      const fakeMsg: Message = {
        id: Math.random().toString(),
        chat_id: selectedChat.id,
        sender_type: 'admin',
        content: text,
        image_url: null,
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, fakeMsg])
    } catch {
      toast.error('Failed to send')
      setInputText(text)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (ts: string) => new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

  const filteredProfiles = profiles.filter(p => {
    const q = searchQuery.toLowerCase()
    if (!q) return true
    return (
      (p.full_name?.toLowerCase().includes(q)) ||
      (p.email?.toLowerCase().includes(q)) ||
      (p.business_name?.toLowerCase().includes(q))
    )
  })

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-2xl border-b border-black/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0071e3] to-[#5856d6] rounded-xl flex items-center justify-center shadow-md">
              <Users size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#1d1d1f]">Users & Chat</h1>
              <p className="text-xs text-[#86868b] font-medium">All Registered Accounts</p>
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-3xl border border-black/[0.06] overflow-hidden shadow-sm flex" style={{ height: 'calc(100vh - 140px)' }}>
          {/* Left Sidebar */}
          <div className={`w-full md:w-[380px] border-r border-black/[0.06] flex flex-col shrink-0 ${selectedProfile ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-3 border-b border-black/[0.04]">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#f5f5f7] rounded-xl text-sm text-[#1d1d1f] placeholder:text-[#a1a1a6] outline-none focus:ring-2 focus:ring-[#0071e3]/20 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 size={28} className="animate-spin text-[#0071e3]" />
                </div>
              ) : filteredProfiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                  <User size={32} className="text-[#d2d2d7] mb-3" />
                  <p className="text-sm text-[#86868b] font-medium">No users found</p>
                </div>
              ) : (
                filteredProfiles.map((profile) => {
                  const isSelected = selectedProfile?.id === profile.id
                  const chat = chatMap[profile.id]
                  const latestMsg = chat ? latestMsgMap[chat.id] : null

                  return (
                    <div
                      key={profile.id}
                      onClick={() => selectUser(profile)}
                      className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer border-b border-black/[0.03] transition-colors ${
                        isSelected ? 'bg-[#0071e3]/[0.08]' : 'hover:bg-[#f5f5f7]'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0071e3]/20 to-[#5856d6]/20 flex items-center justify-center text-sm font-bold text-[#0071e3] shrink-0">
                        {(profile.full_name || profile.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="font-bold text-[14px] text-[#1d1d1f] truncate">
                            {profile.full_name || profile.email?.split('@')[0] || 'Unknown'}
                          </p>
                          <span className="text-[11px] text-[#86868b] shrink-0 ml-2">
                            {latestMsg ? formatDate(latestMsg.created_at) : formatDate(profile.created_at)}
                          </span>
                        </div>
                        <p className="text-[13px] text-[#86868b] truncate">
                          {latestMsg?.content ? latestMsg.content.slice(0, 40) : profile.email}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Chat View */}
          <div className={`flex-1 flex flex-col ${!selectedProfile ? 'hidden md:flex' : 'flex'}`}>
            {!selectedProfile ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                <div className="w-24 h-24 rounded-full bg-[#0071e3]/[0.08] flex items-center justify-center mb-6">
                  <Users size={40} className="text-[#0071e3]" />
                </div>
                <h2 className="text-2xl font-bold text-[#1d1d1f] mb-2">Users Directory</h2>
                <p className="text-sm text-[#86868b] max-w-sm">
                  Select a user from the sidebar to view their profile and start a chat.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-[#f5f5f7] px-5 py-3.5 flex items-center gap-3 border-b border-black/[0.06] shrink-0">
                  <button
                    onClick={() => setSelectedProfile(null)}
                    className="md:hidden p-1.5 rounded-lg hover:bg-black/5 cursor-pointer"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0071e3]/20 to-[#5856d6]/20 flex items-center justify-center text-sm font-bold text-[#0071e3]">
                    {(selectedProfile.full_name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-[14px] text-[#1d1d1f]">
                      {selectedProfile.full_name || 'Unknown User'}
                    </p>
                    <p className="text-[12px] text-[#86868b]">
                      {selectedProfile.email}
                    </p>
                  </div>
                </div>

                <div
                  className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                  style={{ background: '#e5ddd5 url("data:image/svg+xml,%3Csvg width=\'400\' height=\'400\' viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23d4cec5\' fill-opacity=\'0.3\'%3E%3Ccircle cx=\'100\' cy=\'100\' r=\'3\'/%3E%3Ccircle cx=\'200\' cy=\'200\' r=\'3\'/%3E%3Ccircle cx=\'300\' cy=\'300\' r=\'3\'/%3E%3Ccircle cx=\'50\' cy=\'250\' r=\'2\'/%3E%3Ccircle cx=\'350\' cy=\'50\' r=\'2\'/%3E%3C/g%3E%3C/svg%3E")' }}
                >
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 size={28} className="animate-spin text-[#0071e3]" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="inline-flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-black/5 shadow-sm">
                        <MessageCircle size={24} className="text-[#86868b] mb-2" />
                        <p className="text-sm font-bold text-[#1d1d1f]">Say Hello!</p>
                        <p className="text-xs text-[#86868b] mt-1">Start a conversation with {selectedProfile.full_name}</p>
                      </div>
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
                          <p className={`text-[11px] font-bold mb-1 ${
                            msg.sender_type === 'admin' ? 'text-[#128c7e]' : 'text-[#6b5ce7]'
                          }`}>
                            {msg.sender_type === 'admin' ? 'You (Admin)' : selectedProfile.full_name || 'User'}
                          </p>
                          {msg.content && (
                            <p className="text-[14px] text-[#1d1d1f] whitespace-pre-wrap leading-relaxed">
                              {msg.content}
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

                <div className="bg-[#f0f0f0] px-4 py-3 flex items-center gap-3 shrink-0 border-t border-black/5">
                  <div className="flex-1 bg-white rounded-3xl border border-black/10 px-4 py-2.5">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder="Type a message to the user..."
                      className="w-full text-[14px] text-[#1d1d1f] placeholder:text-[#a1a1a6] outline-none bg-transparent"
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!inputText.trim() || sending}
                    className="w-10 h-10 rounded-full bg-[#128c7e] flex items-center justify-center text-white hover:bg-[#075e54] transition-colors cursor-pointer disabled:opacity-50 shrink-0 shadow-md"
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
