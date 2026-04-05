import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = {
  title: 'Dashboard — Admin Panel',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // Verify admin
  if (user.email !== 'netnad345@gmail.com') {
    await supabase.auth.signOut()
    redirect('/')
  }

  // Use admin client to bypass RLS and get all plan requests
  const admin = createAdminClient()

  const { data: requests } = await admin
    .from('plan_requests')
    .select('*')
    .order('created_at', { ascending: false })

  // Get user profiles for each request
  const userIds = [...new Set((requests || []).map((r: { user_id: string }) => r.user_id))]
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, email, phone, plan_tier, business_name')
    .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])

  const profileMap = Object.fromEntries(
    (profiles || []).map((p: { id: string; full_name: string | null; email: string | null; phone: string | null; plan_tier: string | null; business_name: string | null }) => [p.id, p])
  )

  // Stats
  const totalRequests = requests?.length || 0
  const pendingCount = requests?.filter((r: { status: string }) => r.status === 'pending').length || 0
  const approvedCount = requests?.filter((r: { status: string }) => r.status === 'approved').length || 0

  return (
    <DashboardClient
      requests={requests || []}
      profileMap={profileMap}
      stats={{ totalRequests, pendingCount, approvedCount }}
    />
  )
}
