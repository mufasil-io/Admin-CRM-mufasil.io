import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    // 1. Verify the caller is the admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.email !== 'netnad345@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { request_id, action, admin_note } = await req.json()

    if (!request_id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // 2. Use admin client to bypass RLS
    const admin = createAdminClient()

    // 3. Get the plan request
    const { data: planRequest, error: fetchError } = await admin
      .from('plan_requests')
      .select('*')
      .eq('id', request_id)
      .single()

    if (fetchError || !planRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (planRequest.status !== 'pending') {
      return NextResponse.json({ error: 'This request has already been processed' }, { status: 409 })
    }

    // 4. Update the plan request status
    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    const { error: updateRequestError } = await admin
      .from('plan_requests')
      .update({
        status: newStatus,
        admin_note: admin_note || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request_id)

    if (updateRequestError) {
      console.error('Update request error:', updateRequestError)
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
    }

    // 5. If approved, upgrade the user's plan in profiles
    if (action === 'approve') {
      const { error: updateProfileError } = await admin
        .from('profiles')
        .update({
          plan_tier: planRequest.requested_plan,
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', planRequest.user_id)

      if (updateProfileError) {
        console.error('Update profile error:', updateProfileError)
        // Rollback request status
        await admin
          .from('plan_requests')
          .update({ status: 'pending', admin_note: 'Auto-rollback: profile update failed' })
          .eq('id', request_id)

        return NextResponse.json({ error: 'Failed to upgrade user plan' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: action === 'approve'
        ? `User upgraded to ${planRequest.requested_plan} plan successfully.`
        : 'Request rejected.',
    })
  } catch (error) {
    console.error('Process request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
