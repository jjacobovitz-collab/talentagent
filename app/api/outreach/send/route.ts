import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId, customMessage } = await request.json()
  if (!matchId) return NextResponse.json({ error: 'matchId required' }, { status: 400 })

  const admin = createAdminClient()

  // Fetch match with candidate and recruiter details
  const { data: match, error } = await admin
    .from('autonomous_matches')
    .select(`
      id, match_status, outreach_email_draft,
      candidate_profiles(user_id, title, profiles(full_name, email)),
      job_postings(title, company_name, recruiter_id, profiles:recruiter_id(full_name, email))
    `)
    .eq('id', matchId)
    .single()

  if (error || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  // Only send if revealed
  if (!['revealed', 'mutual_confirmed', 'in_conversation', 'offer_made'].includes(match.match_status)) {
    return NextResponse.json({ error: 'Match not yet revealed' }, { status: 403 })
  }

  // Verify caller is part of this match
  const candidate = match.candidate_profiles as any
  const job = match.job_postings as any
  const isCandidate = candidate?.user_id === user.id
  const isRecruiter = job?.recruiter_id === user.id
  if (!isCandidate && !isRecruiter) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const emailBody = customMessage || match.outreach_email_draft
  if (!emailBody) {
    return NextResponse.json({ error: 'No email content available' }, { status: 400 })
  }

  // Send via Resend if configured
  const resendApiKey = process.env.RESEND_API_KEY
  if (resendApiKey) {
    const recipientEmail = isCandidate
      ? (job?.profiles as any)?.email
      : (candidate?.profiles as any)?.email
    const recipientName = isCandidate
      ? (job?.profiles as any)?.full_name
      : (candidate?.profiles as any)?.full_name
    const senderName = isCandidate
      ? (candidate?.profiles as any)?.full_name
      : (job?.profiles as any)?.full_name

    if (recipientEmail) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'TalentAgent <noreply@talentagent.app>',
          to: [recipientEmail],
          subject: `Introduction: ${job?.title} at ${job?.company_name}`,
          text: emailBody,
          reply_to: isCandidate
            ? (candidate?.profiles as any)?.email
            : (job?.profiles as any)?.email,
        }),
      })

      // Update match status to in_conversation
      await admin
        .from('autonomous_matches')
        .update({ match_status: 'in_conversation' })
        .eq('id', matchId)

      // Notify recipient
      await admin.from('notifications').insert({
        user_id: isCandidate ? candidate?.user_id : job?.recruiter_id,
        type: 'outreach_sent',
        title: 'Introduction email sent',
        body: `${senderName} sent you an introduction for ${job?.title} at ${job?.company_name}.`,
        match_id: matchId,
      })

      return NextResponse.json({ success: true, sent: true, to: recipientName })
    }
  }

  // Fallback: just return the draft for manual sending
  return NextResponse.json({ success: true, sent: false, draft: emailBody, note: 'RESEND_API_KEY not configured — copy the draft above to send manually.' })
}
