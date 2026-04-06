import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()

  try {
    // Fetch all user profiles
    const { data: profiles, error: profileErr } = await admin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profileErr) throw profileErr

    // Fetch all existing general chats
    const { data: chats, error: chatErr } = await admin
      .from('crm_chats')
      .select('*')
      .order('updated_at', { ascending: false })

    if (chatErr) throw chatErr

    // Fetch latest message for each chat
    const chatIds = chats.map((c: any) => c.id)
    let latestMsgMap: Record<string, any> = {}

    if (chatIds.length > 0) {
      const { data: msgs } = await admin
        .from('crm_messages')
        .select('*')
        .in('chat_id', chatIds)
        .order('created_at', { ascending: false })

      msgs?.forEach((m: any) => {
        if (!latestMsgMap[m.chat_id]) {
          latestMsgMap[m.chat_id] = m
        }
      })
    }

    return NextResponse.json({
      profiles: profiles || [],
      chats: chats || [],
      latestMsgMap
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const admin = createAdminClient()
  const body = await req.json()
  const { action, user_id, chat_id, text_content } = body

  try {
    if (action === 'get_or_create_chat') {
      // Find existing chat for user
      let { data: chat } = await admin
        .from('crm_chats')
        .select('*')
        .eq('user_id', user_id)
        .single()

      if (!chat) {
        // Create new chat
        const { data: newChat, error } = await admin
          .from('crm_chats')
          .insert({ user_id })
          .select()
          .single()
        
        if (error) throw error
        chat = newChat
      }

      // Fetch messages
      const { data: messages, error: msgErr } = await admin
        .from('crm_messages')
        .select('*')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: true })

      if (msgErr) throw msgErr

      return NextResponse.json({ chat, messages })
    }

    if (action === 'send_message') {
      const { data: msg, error } = await admin
        .from('crm_messages')
        .insert({
          chat_id,
          sender_type: 'admin',
          content: text_content
        })
        .select()
        .single()

      if (error) throw error

      // Update chat updated_at
      await admin.from('crm_chats').update({ updated_at: new Date().toISOString() }).eq('id', chat_id)

      return NextResponse.json({ message: msg })
    }

    if (action === 'get_messages') {
      const { data: messages, error } = await admin
        .from('crm_messages')
        .select('*')
        .eq('chat_id', chat_id)
        .order('created_at', { ascending: true })

      if (error) throw error

      return NextResponse.json({ messages })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
