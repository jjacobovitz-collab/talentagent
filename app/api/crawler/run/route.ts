import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const GREENHOUSE_BOARDS = [
  { company: 'Stripe', token: 'stripe' },
  { company: 'Figma', token: 'figma' },
  { company: 'Notion', token: 'notionhq' },
  { company: 'Linear', token: 'linear' },
  { company: 'Vercel', token: 'vercel' },
  { company: 'Retool', token: 'retool' },
  { company: 'Rippling', token: 'rippling' },
  { company: 'Brex', token: 'brex' },
  { company: 'Plaid', token: 'plaid' },
]

const LEVER_COMPANIES = [
  { company: 'Shopify', token: 'shopify' },
  { company: 'Datadog', token: 'datadog' },
  { company: 'Twilio', token: 'twilio' },
  { company: 'Confluent', token: 'confluent' },
]

function isEngineeringRole(title: string): boolean {
  const keywords = [
    'engineer', 'developer', 'architect', 'devops', 'sre',
    'backend', 'frontend', 'fullstack', 'full-stack', 'full stack',
    'platform', 'infrastructure', 'data engineer', 'ml engineer',
    'software', 'technical lead', 'tech lead', 'staff engineer',
    'principal engineer', 'mobile', 'ios', 'android',
  ]
  return keywords.some(kw => title.toLowerCase().includes(kw))
}

async function parseJobDescription(rawDescription: string, title: string, company: string): Promise<any> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Parse this job description for ${title} at ${company} and return ONLY valid JSON:
{
  "required_skills": [],
  "preferred_skills": [],
  "tech_stack": [],
  "years_experience_min": null,
  "years_experience_max": null,
  "seniority_level": "junior|mid|senior|staff|principal|director",
  "role_type": "backend|frontend|fullstack|devops|data|ml|mobile|other",
  "comp_min": null,
  "comp_max": null,
  "remote_type": "remote|hybrid|onsite|unknown",
  "visa_sponsorship": null,
  "key_responsibilities": [],
  "is_engineering_role": true
}

Job Description:
${rawDescription.substring(0, 3000)}`,
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return { is_engineering_role: true, tech_stack: [], required_skills: [] }
  }
}

async function crawlGreenhouse(supabase: any): Promise<number> {
  let count = 0
  for (const board of GREENHOUSE_BOARDS) {
    try {
      const res = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${board.token}/jobs?content=true`,
        { signal: AbortSignal.timeout(10000) }
      )
      if (!res.ok) continue
      const data = await res.json()
      const jobs = Array.isArray(data.jobs) ? data.jobs : []

      for (const job of jobs) {
        if (!isEngineeringRole(job.title)) continue

        const parsed = await parseJobDescription(
          job.content || job.title,
          job.title,
          board.company
        )

        if (!parsed.is_engineering_role) continue

        await supabase.from('job_postings').upsert({
          source: 'greenhouse',
          source_url: job.absolute_url,
          source_job_id: String(job.id),
          title: job.title,
          company_name: board.company,
          location: job.location?.name || null,
          remote_type: parsed.remote_type || 'unknown',
          raw_description: (job.content || '').substring(0, 10000),
          parsed_requirements: parsed,
          posted_at: job.updated_at || new Date().toISOString(),
          is_active: true,
        }, { onConflict: 'source_url' })

        count++
      }
    } catch (err) {
      console.error(`Greenhouse ${board.company} error:`, err)
    }
  }
  return count
}

async function crawlLever(supabase: any): Promise<number> {
  let count = 0
  for (const company of LEVER_COMPANIES) {
    try {
      const res = await fetch(
        `https://api.lever.co/v0/postings/${company.token}?mode=json`,
        { signal: AbortSignal.timeout(10000) }
      )
      if (!res.ok) continue
      const jobs: any[] = await res.json()
      if (!Array.isArray(jobs)) continue

      for (const job of jobs) {
        if (!isEngineeringRole(job.text || '')) continue

        const rawDescription = [
          job.descriptionBody || '',
          ...(job.lists || []).map((l: any) => `${l.text}: ${l.content}`),
        ].join('\n')

        const parsed = await parseJobDescription(rawDescription, job.text, company.company)
        if (!parsed.is_engineering_role) continue

        await supabase.from('job_postings').upsert({
          source: 'lever',
          source_url: job.hostedUrl,
          source_job_id: job.id,
          title: job.text,
          company_name: company.company,
          location: job.categories?.location || null,
          remote_type: parsed.remote_type || 'unknown',
          raw_description: rawDescription.substring(0, 10000),
          parsed_requirements: parsed,
          posted_at: job.createdAt ? new Date(job.createdAt).toISOString() : new Date().toISOString(),
          is_active: true,
        }, { onConflict: 'source_url' })

        count++
      }
    } catch (err) {
      console.error(`Lever ${company.company} error:`, err)
    }
  }
  return count
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const [greenhouseCount, leverCount] = await Promise.all([
    crawlGreenhouse(supabase),
    crawlLever(supabase),
  ])

  return NextResponse.json({
    success: true,
    jobs_saved: greenhouseCount + leverCount,
    greenhouse: greenhouseCount,
    lever: leverCount,
  })
}

// Also allow POST for manual trigger
export async function POST(request: NextRequest) {
  return GET(request)
}
