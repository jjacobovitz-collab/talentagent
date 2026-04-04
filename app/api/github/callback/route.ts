import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  // state param received but not needed after auth.getUser() validates the session

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard/github?error=no_code', request.url))
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Exchange code for access token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: process.env.GITHUB_REDIRECT_URI,
    }),
  })

  const tokenData = await tokenResponse.json()

  if (tokenData.error || !tokenData.access_token) {
    console.error('GitHub token error:', tokenData)
    return NextResponse.redirect(new URL('/dashboard/github?error=token_exchange_failed', request.url))
  }

  const accessToken = tokenData.access_token

  // Fetch GitHub user profile
  const githubUserResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })

  const githubUser = await githubUserResponse.json()

  if (!githubUser.login) {
    return NextResponse.redirect(new URL('/dashboard/github?error=profile_fetch_failed', request.url))
  }

  // Save to github_profiles using admin client
  const admin = createAdminClient()
  await admin.from('github_profiles').upsert({
    user_id: user.id,
    github_username: githubUser.login,
    github_access_token: accessToken,
    public_repos_count: githubUser.public_repos,
    followers: githubUser.followers,
    following: githubUser.following,
    account_created_at: githubUser.created_at,
    last_active_at: githubUser.updated_at,
    ingestion_status: 'pending',
  }, { onConflict: 'user_id' })

  // Trigger ingestion in background (fire and forget)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  fetch(`${appUrl}/api/github/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
    body: JSON.stringify({ userId: user.id }),
  }).catch(console.error)

  return NextResponse.redirect(new URL('/dashboard/github?connected=true', request.url))
}
