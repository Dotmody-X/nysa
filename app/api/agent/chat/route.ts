import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)
const openclawGateway = process.env.OPENCLAW_GATEWAY_URL || 'http://192.168.1.100:18789' // Pi5 IP
const openclawToken = process.env.OPENCLAW_TOKEN

export async function POST(request: NextRequest) {
  try {
    const { message, userId } = await request.json()

    if (!message || !userId) {
      return NextResponse.json(
        { error: 'Message et userId requis' },
        { status: 400 }
      )
    }

    // Charger le contexte utilisateur complet
    const context = await loadUserContext(userId)

    // Envoyer à Cóndor (OpenClaw) pour une réponse intelligente
    const reply = await generateResponse(message, context, userId)

    return NextResponse.json({
      reply,
      timestamp: new Date().toISOString(),
      context_loaded: true
    })
  } catch (error) {
    console.error('Agent error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur', details: String(error) },
      { status: 500 }
    )
  }
}

async function loadUserContext(userId: string) {
  // Tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: true })

  // Projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)

  // Events (7 prochains jours)
  const now = new Date()
  const next7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_at', now.toISOString())
    .lt('start_at', next7days.toISOString())
    .order('start_at', { ascending: true })

  // Budget
  const { data: budgetEntries } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('date_month', new Date().toISOString().slice(0, 7))

  // Time entries
  const { data: timeEntries } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('date', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())

  return {
    tasks: tasks || [],
    projects: projects || [],
    events: events || [],
    budget: budgetEntries || [],
    timeEntries: timeEntries || []
  }
}

async function generateResponse(message: string, context: any, userId: string): Promise<string> {
  try {
    // === AGENT CÓNDOR AVEC PLEINS POUVOIRS ===
    // Envoyer le message + contexte complet + disponibilité des tools
    
    const userContext = `
🔥 **CONTEXTE NYSA COMPLET** (Nathan):

📋 **Tâches:** ${context.tasks.length} total
  • Urgentes: ${context.tasks.filter((t: any) => t.priority === 'urgent' && t.status !== 'done').length}
  • À faire: ${context.tasks.filter((t: any) => t.status === 'todo').length}
  • Faites: ${context.tasks.filter((t: any) => t.status === 'done').length}
  Top 3: ${context.tasks.slice(0, 3).map((t: any) => t.title).join(', ')}

🎯 **Projets:** ${context.projects.length} total
  • Actifs: ${context.projects.filter((p: any) => p.status === 'active').length}
  • Complétés: ${context.projects.filter((p: any) => p.status === 'completed').length}
  Détails: ${JSON.stringify(context.projects.slice(0, 3))}

📅 **Événements (7j):** ${context.events.length}
  ${context.events.slice(0, 5).map((e: any) => `• ${e.title} (${new Date(e.start_at).toLocaleDateString('fr-FR')})`).join('\n  ')}

⏱️ **Time Tracking:** ${Math.floor(context.timeEntries.reduce((sum: number, e: any) => sum + (e.duration_seconds || 0), 0) / 3600)}h cette semaine

💰 **Budget:** ${context.budget.reduce((sum: number, b: any) => sum + (b.amount || 0), 0)}€ ce mois

🔧 **OUTILS DISPONIBLES:**
  • read_nysa_file(path) - Lire un fichier NYSA
  • write_nysa_file(path, content) - Modifier un fichier NYSA
  • git_commit(message) - Commiter les changements
  • git_push() - Pusher vers GitHub
  • supabase_query(sql) - Exécuter une requête Supabase
  • supabase_update(table, data, where) - Mettre à jour Supabase
  • vercel_redeploy() - Redéployer NYSA sur Vercel
  • create_task(title, priority, due_date) - Créer une tâche
  • update_project(id, updates) - Modifier un projet
  • Accès complet au code source NYSA
  • Capacité à proposer et implémenter des changements

Le message de Nathan: "${message}"

🎯 Tu dois:
1. Analyser la demande
2. Utiliser les tools si nécessaire
3. Être proactif et proposer des améliorations
4. Exécuter les changements demandés
5. Faire des commits Git automatiquement`

    // Appel au vrai agent Cóndor
    const response = await fetch(`${openclawGateway}/api/agent/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(openclawToken && { 'Authorization': `Bearer ${openclawToken}` })
      },
      body: JSON.stringify({
        message: userContext,
        agentId: 'main',
        userId: userId,
        channelContext: 'nysa-web'
      })
    })

    if (response.ok) {
      const data = await response.json()
      return data.reply || data.message || '✅ Je traite ta demande...'
    }

    console.warn('OpenClaw API unavailable, using fallback')
    return generateFallbackResponse(message, context)
  } catch (error) {
    console.error('Error calling Cóndor:', error)
    return generateFallbackResponse(message, context)
  }
}

function generateFallbackResponse(message: string, context: any): string {
  const msg = message.toLowerCase()

  // 1. ANALYSE DES TÂCHES
  if (msg.includes('tâche') || msg.includes('todo') || msg.includes('urgent')) {
    return analyzeTasks(context.tasks)
  }

  // 2. ANALYSE DU CALENDRIER
  if (msg.includes('calendrier') || msg.includes('agenda') || msg.includes('prochaine') || msg.includes('deadline') || msg.includes('événement')) {
    return analyzeEvents(context.events)
  }

  // 3. ANALYSE DES PROJETS
  if (msg.includes('projet') || msg.includes('progress')) {
    return analyzeProjects(context.projects)
  }

  // 4. ANALYSE DU BUDGET
  if (msg.includes('budget') || msg.includes('dépense') || msg.includes('argent')) {
    return analyzeBudget(context.budget)
  }

  // 5. ANALYSE TIME TRACKER
  if (msg.includes('temps') || msg.includes('tracker') || msg.includes('semaine')) {
    return analyzeTime(context.timeEntries)
  }

  // 6. PLANIFICATION SEMAINE
  if (msg.includes('semaine') || msg.includes('plani')) {
    return planWeek(context)
  }

  // 7. RÉSUMÉ GÉNÉRAL
  if (msg.includes('résumé') || msg.includes('status') || msg.includes('comment')) {
    return generateSummary(context)
  }

  // 8. CONSEILS
  if (msg.includes('aide') || msg.includes('conseil') || msg.includes('recommand')) {
    return generateAdvice(context)
  }

  // Réponse par défaut
  return `Je peux t'aider avec:
📋 **Tâches** - "Quelles sont mes tâches urgentes?"
📅 **Agenda** - "Quand est ma prochaine deadline?"
🎯 **Projets** - "Quel est mon progress?"
💰 **Budget** - "Analyse mon budget"
⏱️ **Temps** - "Résume ma semaine"
🎨 **Conseils** - "Donne-moi des conseils"

Que veux-tu savoir?`
}

function analyzeTasks(tasks: any[]): string {
  if (!tasks || tasks.length === 0) {
    return "✅ Tu n'as pas de tâches! C'est clean."
  }

  const urgent = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done')
  const high = tasks.filter(t => t.priority === 'high' && t.status !== 'done')
  const todo = tasks.filter(t => t.status === 'todo')
  const done = tasks.filter(t => t.status === 'done')

  let response = `📊 **Analyse de tes tâches:**\n\n`
  response += `🔴 **Urgentes:** ${urgent.length}\n`
  response += `🟠 **Hautes priorité:** ${high.length}\n`
  response += `📝 **À faire:** ${todo.length}\n`
  response += `✅ **Complétées:** ${done.length}\n\n`

  if (urgent.length > 0) {
    response += `🚨 **Tâches urgentes:**\n`
    urgent.slice(0, 3).forEach(t => {
      response += `• ${t.title}${t.due_date ? ` (${new Date(t.due_date).toLocaleDateString('fr-FR')})` : ''}\n`
    })
  }

  response += `\n💡 Focus d'abord sur les urgentes, puis les hautes priorités.`
  return response
}

function analyzeEvents(events: any[]): string {
  if (!events || events.length === 0) {
    return "📅 Tu n'as aucun événement prévu les 7 prochains jours."
  }

  let response = `📅 **Tes événements (7 prochains jours):**\n\n`
  
  events.slice(0, 10).forEach(e => {
    const date = new Date(e.start_at)
    const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const dateStr = date.toLocaleDateString('fr-FR')
    response += `• **${e.title}** - ${dateStr} à ${time}\n`
  })

  if (events.length > 10) {
    response += `\n... et ${events.length - 10} autres événements`
  }

  return response
}

function analyzeProjects(projects: any[]): string {
  if (!projects || projects.length === 0) {
    return "🎯 Tu n'as pas de projets pour l'instant."
  }

  const active = projects.filter(p => p.status === 'active')
  const completed = projects.filter(p => p.status === 'completed')

  let response = `🎯 **Tes projets:**\n\n`
  response += `🟢 **Actifs:** ${active.length}\n`
  response += `✅ **Complétés:** ${completed.length}\n\n`

  if (active.length > 0) {
    response += `**En cours:**\n`
    active.forEach(p => {
      response += `• ${p.name} (${p.progress}% complété)\n`
    })
  }

  return response
}

function analyzeBudget(budget: any[]): string {
  if (!budget || budget.length === 0) {
    return "💰 Pas d'entrées de budget ce mois."
  }

  const total = budget.reduce((sum, b) => sum + (b.amount || 0), 0)
  return `💰 **Budget du mois:**\nTotal: ${total}€\nNombre d'entrées: ${budget.length}`
}

function analyzeTime(timeEntries: any[]): string {
  if (!timeEntries || timeEntries.length === 0) {
    return "⏱️ Pas de time tracking cette semaine."
  }

  const totalMinutes = timeEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `⏱️ **Temps tracké cette semaine:**\n${hours}h ${minutes}m sur ${timeEntries.length} entrées`
}

function planWeek(context: any): string {
  const { tasks, events, projects } = context
  
  let response = `📋 **Plan de ta semaine:**\n\n`
  
  const urgentTasks = tasks.filter((t: any) => t.priority === 'urgent' && t.status !== 'done')
  const weekEvents = events.slice(0, 7)
  const activeProjects = projects.filter((p: any) => p.status === 'active')

  response += `🚨 **Focus (Urgent):** ${urgentTasks.length} tâches\n`
  response += `📅 **Événements:** ${weekEvents.length} cette semaine\n`
  response += `🎯 **Projets actifs:** ${activeProjects.length}\n\n`

  response += `**Recommandation:**\n`
  response += `1️⃣ Traiter les ${urgentTasks.length} tâches urgentes\n`
  response += `2️⃣ Participer aux ${weekEvents.length} événements\n`
  response += `3️⃣ Avancer sur ${Math.min(2, activeProjects.length)} projets\n`

  return response
}

function generateSummary(context: any): string {
  const { tasks, events, projects } = context
  
  const doneTasks = tasks.filter((t: any) => t.status === 'done')
  const urgentTasks = tasks.filter((t: any) => t.priority === 'urgent' && t.status !== 'done')
  
  let response = `📊 **Résumé de ton activité:**\n\n`
  response += `✅ **Tâches complétées:** ${doneTasks.length}\n`
  response += `📋 **Tâches totales:** ${tasks.length}\n`
  response += `🔴 **Urgentes non faites:** ${urgentTasks.length}\n`
  response += `📅 **Événements:** ${events.length} cette semaine\n`
  response += `🎯 **Projets:** ${projects.length}\n\n`
  
  const completion = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0
  response += `📈 **Taux de complétude:** ${completion}%`
  
  return response
}

function generateAdvice(context: any): string {
  const { tasks, projects } = context
  
  const urgentTasks = tasks.filter((t: any) => t.priority === 'urgent' && t.status !== 'done')
  const stalledProjects = projects.filter((p: any) => p.status === 'active' && p.progress < 20)
  
  let response = `💡 **Mes conseils:**\n\n`
  
  if (urgentTasks.length > 3) {
    response += `🚨 Tu as ${urgentTasks.length} tâches urgentes. Priorise les 3 les plus importantes.\n\n`
  }
  
  if (stalledProjects.length > 0) {
    response += `⚠️ ${stalledProjects.length} projets semblent bloqués. Identifie les obstacles.\n\n`
  }
  
  const doneTasks = tasks.filter((t: any) => t.status === 'done')
  if (doneTasks.length / tasks.length > 0.8) {
    response += `🎉 Excellent travail! Tu as un taux de complétude élevé.\n\n`
  }
  
  response += `💪 Continue comme ça!`
  
  return response
}
