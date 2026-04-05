import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET: Fetch all upgrade chats with messages (admin only)
export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all chats
    const { data: chats, error: chatsErr } = await supabaseAdmin
      .from('upgrade_chats')
      .select('*')
      .order('updated_at', { ascending: false });

    if (chatsErr) {
      return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
    }

    // Fetch profiles for all chat users
    const userIds = [...new Set((chats || []).map(c => c.user_id))];
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone, plan_tier, business_name')
      .in('id', userIds.length > 0 ? userIds : ['none']);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileMap: Record<string, any> = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    // Fetch latest message for each chat (for preview)
    const chatIds = (chats || []).map(c => c.id);
    const { data: latestMessages } = await supabaseAdmin
      .from('upgrade_messages')
      .select('*')
      .in('chat_id', chatIds.length > 0 ? chatIds : ['none'])
      .order('created_at', { ascending: false });

    // Group: latest message per chat
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const latestMsgMap: Record<string, any> = {};
    (latestMessages || []).forEach(m => {
      if (!latestMsgMap[m.chat_id]) latestMsgMap[m.chat_id] = m;
    });

    return NextResponse.json({ chats: chats || [], profileMap, latestMsgMap });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

// POST: Admin sends message or takes action
export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, chat_id, text_content, new_plan } = body;

    if (action === 'send_message') {
      const { error } = await supabaseAdmin.from('upgrade_messages').insert({
        chat_id,
        sender_type: 'admin',
        text_content: text_content || null,
      });
      if (error) return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'get_messages') {
      const { data: messages } = await supabaseAdmin
        .from('upgrade_messages')
        .select('*')
        .eq('chat_id', chat_id)
        .order('created_at', { ascending: true });
      return NextResponse.json({ messages: messages || [] });
    }

    if (action === 'approve') {
      // Get chat to find user_id
      const { data: chat } = await supabaseAdmin
        .from('upgrade_chats')
        .select('user_id')
        .eq('id', chat_id)
        .single();

      if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });

      // Update user's plan_tier
      const { error: planError } = await supabaseAdmin
        .from('profiles')
        .update({ plan_tier: new_plan || 'pro' })
        .eq('id', chat.user_id);

      if (planError) return NextResponse.json({ error: 'Failed to upgrade plan' }, { status: 500 });

      // Update chat status
      await supabaseAdmin
        .from('upgrade_chats')
        .update({ status: 'approved' })
        .eq('id', chat_id);

      // Send approval message
      await supabaseAdmin.from('upgrade_messages').insert({
        chat_id,
        sender_type: 'admin',
        text_content: `✅ Your plan has been upgraded to ${(new_plan || 'pro').charAt(0).toUpperCase() + (new_plan || 'pro').slice(1)}! 🎉\n\nYour new features are now active. Refresh your dashboard to see the changes.\n\nThank you for choosing Mufasil.io!`,
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'reject') {
      await supabaseAdmin
        .from('upgrade_chats')
        .update({ status: 'rejected' })
        .eq('id', chat_id);

      await supabaseAdmin.from('upgrade_messages').insert({
        chat_id,
        sender_type: 'admin',
        text_content: text_content || '❌ Your upgrade request could not be processed. Please ensure your payment is correct and try again, or contact support for help.',
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
