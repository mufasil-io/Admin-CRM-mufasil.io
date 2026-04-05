'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Shield, LogIn, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    // Verify admin email
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL && user?.email !== 'netnad345@gmail.com') {
      await supabase.auth.signOut()
      toast.error('Access denied. Admin only.')
      setLoading(false)
      return
    }

    toast.success('Welcome back, Admin!')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#f5f5f7] via-white to-[#e8f2ff]">
      <div
        className="w-full max-w-md"
        style={{ animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both' }}
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-[#0071e3] to-[#5856d6] rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20">
            <Shield size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1d1d1f]">
            Admin Panel
          </h1>
          <p className="text-[#86868b] text-sm font-medium mt-2">
            mufasil.io CRM — Plan Management
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="bg-white/70 backdrop-blur-2xl border border-white/40 rounded-3xl p-8 shadow-lg shadow-black/[0.03]">
          <div className="mb-5">
            <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@email.com"
              required
              className="w-full px-4 py-3.5 rounded-2xl border border-[#d2d2d7]/60 bg-white/80 text-[15px] font-medium text-[#1d1d1f] placeholder:text-[#a1a1a6] focus:outline-none focus:border-[#0071e3] focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          </div>

          <div className="mb-8">
            <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3.5 pr-12 rounded-2xl border border-[#d2d2d7]/60 bg-white/80 text-[15px] font-medium text-[#1d1d1f] placeholder:text-[#a1a1a6] focus:outline-none focus:border-[#0071e3] focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] cursor-pointer"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-[15px] bg-gradient-to-b from-[#0071e3] to-[#0062c3] text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-[#86868b] font-medium mt-6">
          Restricted access — Authorized administrators only
        </p>
      </div>
    </div>
  )
}
