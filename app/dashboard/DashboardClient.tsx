'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Shield, LogOut, Clock, CheckCircle2, XCircle, Users,
  FileCheck, AlertCircle, Eye, X, ChevronDown,
  Sparkles, CreditCard, MessageSquare
} from 'lucide-react'

interface PlanRequest {
  id: string
  user_id: string
  requested_plan: string
  message: string | null
  payment_proof_url: string
  status: string
  admin_note: string | null
  created_at: string
  updated_at: string
}

interface UserProfile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  plan_tier: string | null
  business_name: string | null
}

interface DashboardClientProps {
  requests: PlanRequest[]
  profileMap: Record<string, UserProfile>
  stats: { totalRequests: number; pendingCount: number; approvedCount: number }
}

const planColors: Record<string, string> = {
  starter: 'bg-blue-50 text-blue-700 border-blue-200',
  pro: 'bg-purple-50 text-purple-700 border-purple-200',
  enterprise: 'bg-amber-50 text-amber-700 border-amber-200',
}

const planPrices: Record<string, string> = {
  starter: '₹299/mo',
  pro: '₹999/mo',
  enterprise: '₹3,000/mo',
}

const statusConfig = {
  pending: { icon: Clock, label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  approved: { icon: CheckCircle2, label: 'Approved', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  rejected: { icon: XCircle, label: 'Rejected', color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
}

type FilterType = 'all' | 'pending' | 'approved' | 'rejected'

export default function DashboardClient({ requests, profileMap, stats }: DashboardClientProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [viewingProof, setViewingProof] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [actionModal, setActionModal] = useState<{ id: string; action: 'approve' | 'reject'; plan: string } | null>(null)
  const router = useRouter()

  const filtered = filter === 'all'
    ? requests
    : requests.filter(r => r.status === filter)

  const handleAction = async () => {
    if (!actionModal) return
    setProcessingId(actionModal.id)

    try {
      const res = await fetch('/api/admin/process-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: actionModal.id,
          action: actionModal.action,
          admin_note: adminNote || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to process request')
        return
      }

      toast.success(
        actionModal.action === 'approve'
          ? `Plan upgraded to ${actionModal.plan}!`
          : 'Request rejected.'
      )
      setActionModal(null)
      setAdminNote('')
      router.refresh()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setProcessingId(null)
    }
  }

  const handleLogout = async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-2xl border-b border-black/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0071e3] to-[#5856d6] rounded-xl flex items-center justify-center shadow-md">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#1d1d1f]">Admin Panel</h1>
              <p className="text-xs text-[#86868b] font-medium">mufasil.io CRM</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/5 transition-all cursor-pointer"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8" style={{ animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          {[
            { label: 'Total Requests', value: stats.totalRequests, icon: Users, color: 'from-blue-500 to-blue-600' },
            { label: 'Pending Review', value: stats.pendingCount, icon: AlertCircle, color: 'from-amber-500 to-orange-500' },
            { label: 'Approved', value: stats.approvedCount, icon: FileCheck, color: 'from-emerald-500 to-green-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#86868b] uppercase tracking-wider">{stat.label}</span>
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-md`}>
                  <stat.icon size={16} className="text-white" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-[#1d1d1f]">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 mb-6" style={{ animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          {(['all', 'pending', 'approved', 'rejected'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer capitalize ${
                filter === f
                  ? 'bg-[#1d1d1f] text-white shadow-md'
                  : 'bg-white/60 text-[#86868b] hover:bg-white hover:text-[#1d1d1f] border border-black/[0.06]'
              }`}
            >
              {f} {f === 'pending' && stats.pendingCount > 0 ? `(${stats.pendingCount})` : ''}
            </button>
          ))}
        </div>

        {/* Requests List */}
        <div className="space-y-4" style={{ animation: 'slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-black/5 flex items-center justify-center mx-auto mb-4">
                <CreditCard size={32} className="text-[#86868b]" />
              </div>
              <p className="text-lg font-bold text-[#1d1d1f]">No requests found</p>
              <p className="text-sm text-[#86868b] mt-1">
                {filter === 'all' ? 'No upgrade requests have been submitted yet.' : `No ${filter} requests.`}
              </p>
            </div>
          ) : (
            filtered.map((req) => {
              const profile = profileMap[req.user_id]
              const config = statusConfig[req.status as keyof typeof statusConfig] || statusConfig.pending
              const StatusIcon = config.icon

              return (
                <div
                  key={req.id}
                  className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0071e3]/20 to-[#5856d6]/20 flex items-center justify-center text-sm font-bold text-[#0071e3] shrink-0">
                          {(profile?.full_name || profile?.email || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#1d1d1f] truncate">
                            {profile?.full_name || 'Unknown User'}
                          </p>
                          <p className="text-xs text-[#86868b] truncate">
                            {profile?.email || req.user_id.slice(0, 8)}
                            {profile?.business_name && ` · ${profile.business_name}`}
                          </p>
                        </div>
                      </div>

                      {/* Plan & Status */}
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${planColors[req.requested_plan] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          <Sparkles size={12} />
                          {req.requested_plan.charAt(0).toUpperCase() + req.requested_plan.slice(1)} — {planPrices[req.requested_plan]}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${config.bg} ${config.color} ${config.border}`}>
                          <StatusIcon size={12} />
                          {config.label}
                        </span>
                        {profile?.plan_tier && (
                          <span className="text-xs text-[#86868b] font-medium">
                            Current: <span className="capitalize font-bold">{profile.plan_tier}</span>
                          </span>
                        )}
                      </div>

                      {/* Message */}
                      {req.message && (
                        <div className="mt-3 flex items-start gap-2 text-sm text-[#1d1d1f]/70 bg-black/[0.02] rounded-xl p-3">
                          <MessageSquare size={14} className="text-[#86868b] mt-0.5 shrink-0" />
                          <p className="line-clamp-2">{req.message}</p>
                        </div>
                      )}

                      {/* Admin note */}
                      {req.admin_note && (
                        <p className="mt-2 text-xs text-[#86868b] italic">
                          Admin note: {req.admin_note}
                        </p>
                      )}

                      <p className="text-xs text-[#86868b] mt-2">
                        {new Date(req.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })} at{' '}
                        {new Date(req.created_at).toLocaleTimeString('en-IN', { timeStyle: 'short' })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setViewingProof(req.payment_proof_url)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-black/5 hover:bg-black/10 text-[#1d1d1f] transition-all cursor-pointer"
                      >
                        <Eye size={15} />
                        View Proof
                      </button>

                      {req.status === 'pending' && (
                        <>
                          <button
                            onClick={() => { setActionModal({ id: req.id, action: 'approve', plan: req.requested_plan }); setAdminNote('') }}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-b from-[#28cd41] to-[#1fa834] text-white shadow-md shadow-green-500/20 hover:shadow-green-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                          >
                            <CheckCircle2 size={15} />
                            Approve
                          </button>
                          <button
                            onClick={() => { setActionModal({ id: req.id, action: 'reject', plan: req.requested_plan }); setAdminNote('') }}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-b from-[#ff3b30] to-[#e0342a] text-white shadow-md shadow-red-500/20 hover:shadow-red-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                          >
                            <XCircle size={15} />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>

      {/* Payment Proof Lightbox */}
      {viewingProof && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setViewingProof(null)}
          style={{ animation: 'fadeIn 0.2s ease' }}
        >
          <div
            className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}
          >
            <button
              onClick={() => setViewingProof(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-white/90 rounded-full shadow-md hover:bg-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="p-2">
              <img
                src={viewingProof}
                alt="Payment Proof"
                className="w-full max-h-[75vh] object-contain rounded-2xl"
              />
            </div>
            <div className="px-6 py-4 border-t border-black/5">
              <a
                href={viewingProof}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-[#0071e3] hover:underline"
              >
                Open in new tab ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {actionModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActionModal(null)}
          style={{ animation: 'fadeIn 0.2s ease' }}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${
              actionModal.action === 'approve'
                ? 'bg-emerald-50'
                : 'bg-red-50'
            }`}>
              {actionModal.action === 'approve'
                ? <CheckCircle2 size={28} className="text-emerald-600" />
                : <XCircle size={28} className="text-red-500" />
              }
            </div>

            <h3 className="text-xl font-bold text-[#1d1d1f] mb-2">
              {actionModal.action === 'approve' ? 'Approve Upgrade' : 'Reject Request'}
            </h3>
            <p className="text-sm text-[#86868b] mb-6">
              {actionModal.action === 'approve'
                ? `This will upgrade the user to the ${actionModal.plan} plan immediately.`
                : 'The user will be notified that their request was rejected.'
              }
            </p>

            <div className="mb-6">
              <label className="block text-xs font-bold text-[#86868b] uppercase tracking-wider mb-2">
                Admin Note (optional)
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={actionModal.action === 'approve' ? 'e.g. Payment verified. Welcome aboard!' : 'e.g. Payment proof unclear, please resend.'}
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-[#d2d2d7]/60 bg-white text-sm font-medium text-[#1d1d1f] placeholder:text-[#a1a1a6] focus:outline-none focus:border-[#0071e3] focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActionModal(null)}
                className="flex-1 py-3 rounded-2xl text-sm font-bold bg-black/5 text-[#1d1d1f] hover:bg-black/10 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={processingId === actionModal.id}
                className={`flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  actionModal.action === 'approve'
                    ? 'bg-gradient-to-b from-[#28cd41] to-[#1fa834] shadow-md shadow-green-500/25 hover:shadow-green-500/40'
                    : 'bg-gradient-to-b from-[#ff3b30] to-[#e0342a] shadow-md shadow-red-500/25 hover:shadow-red-500/40'
                }`}
              >
                {processingId === actionModal.id ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  actionModal.action === 'approve' ? 'Confirm Approve' : 'Confirm Reject'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
