import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UsersChatClient from './UsersChatClient'

export const metadata = {
  title: 'Users & Chat — Admin Panel',
}

export default async function UsersChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // Verify admin
  if (user.email !== 'netnad345@gmail.com') {
    await supabase.auth.signOut()
    redirect('/')
  }

  return <UsersChatClient />
}
