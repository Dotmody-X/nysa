// ============================================================
// NYSA — API pour OpenClaw Agent
// POST /api/agent/chat
// ============================================================
// Cette API permet à OpenClaw de:
// - Recevoir les requêtes de l'utilisateur
// - Accéder aux données NYSA (tasks, projects, events, etc.)
// - Renvoyer des réponses enrichies

import { NextResponse, NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const AGENT_API_KEY = process.env.AGENT_API_KEY || 'dev-key-change-in-production'

export async function POST(req: NextRequest) {
  try {
    // ✅ Vérifier l'API key
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 })
    }

    const apiKey = authHeader.slice(7)
    if (apiKey !== AGENT_API_KEY) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    // ✅ Parser le corps de la requête
    const body = await req.json()
    const { message, context = {} } = body

    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 })
    }

    // ✅ Créer le client Supabase (avec service role si fourni)
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cs: { name: string; value: string; options?: any }[]) =>
            cs.forEach(c => cookieStore.set(c.name, c.value, c.options)),
        },
      }
    )

    // ✅ Récupérer l'utilisateur (ou utiliser le user_id fourni par OpenClaw)
    const userId = context.user_id
    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id in context' }, { status: 400 })
    }

    // ✅ Récupérer les données NYSA pertinentes
    const [tasksRes, projectsRes, eventsRes] = await Promise.all([
      // Tasks urgentes/à faire
      supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, project_id')
        .eq('user_id', userId)
        .in('status', ['todo', 'in_progress'])
        .order('due_date', { ascending: true })
        .limit(10),

      // Projects actifs
      supabase
        .from('projects')
        .select('id, name, status, priority, progress, deadline')
        .eq('user_id', userId)
        .in('status', ['active', 'paused'])
        .order('updated_at', { ascending: false })
        .limit(10),

      // Events cette semaine
      supabase
        .from('events')
        .select('id, title, start_at, end_at, all_day')
        .eq('user_id', userId)
        .gte('start_at', new Date().toISOString())
        .lte('start_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('start_at', { ascending: true })
        .limit(10),
    ])

    const tasks = tasksRes.data || []
    const projects = projectsRes.data || []
    const events = eventsRes.data || []

    // ✅ Répondre avec les données contextuelles
    return NextResponse.json({
      ok: true,
      message,
      context: {
        user_id: userId,
        tasks_count: tasks.length,
        projects_count: projects.length,
        events_count: events.length,
      },
      data: {
        tasks,
        projects,
        events,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Agent API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

// ✅ GET pour tester
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'NYSA Agent API is running',
    version: '1.0.0',
    docs: 'POST with Authorization: Bearer <API_KEY> and { message, context: { user_id } }',
  })
}
