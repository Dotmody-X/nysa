// ============================================================
// NYSA — Types TypeScript globaux
// ============================================================

// ------ Supabase Database (sera généré automatiquement plus tard) ------
export type Database = any // Remplacer par le type généré via `supabase gen types`

// ------ Utilisateur ------
export interface User {
  id: string
  email: string
  created_at: string
}

// ------ Clients ------
export type ClientStatut = 'actif' | 'inactif' | 'prospect' | 'archive'

export interface Client {
  id: string
  user_id: string
  name: string
  company?: string
  email?: string
  phone?: string
  adresse?: string
  ville?: string
  pays?: string
  vendeur?: string
  statut: ClientStatut
  notes?: string
  created_at: string
  updated_at?: string
}

/**
 * Identifiants d'un client sur un service tiers (site d'etiquettes DGCCRF).
 * Table separee de `clients` a dessein : la liste des clients est affichee
 * partout dans l'app, ces identifiants ne doivent pas voyager avec elle.
 */
export interface ClientAcces {
  id: string
  user_id: string
  client_id: string
  service: string
  identifiant?: string
  motdepasse?: string
  date_creation?: string
  mail_identifiants_envoye: boolean
  mail_mise_a_dispo_envoye: boolean
  mail_installation_envoye: boolean
  notes?: string
  created_at: string
  updated_at?: string
}

// ------ Imprimantes ------
export type ImprimanteStatut =
  | 'demandee' | 'commandee' | 'envoyee' | 'en_service' | 'retournee' | 'hors_service'

export interface Imprimante {
  id: string
  user_id: string
  client_id?: string
  client?: Pick<Client, 'id' | 'name' | 'ville'>
  /** Nom du magasin tel qu'il figure sur la liste d'origine, meme sans client rattache. */
  magasin: string
  modele: string
  serial?: string
  adresse?: string
  date_mise_a_dispo?: string
  statut: ImprimanteStatut
  nombre: number
  document_signe: boolean
  notes?: string
  created_at: string
  updated_at?: string
}

// ------ Projets ------
export type ProjectStatus = 'active' | 'completed' | 'archived' | 'paused'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface Project {
  id: string
  user_id: string
  client_id?: string
  client?: Client
  name: string
  description?: string
  status: ProjectStatus
  priority: Priority
  color: string
  budget?: number
  deadline?: string
  progress: number
  groupe?: string   // Grande catégorie / marque : Le Mixologue | E-Smoker | Aeterna | Interne | Autre
  created_at: string
  updated_at: string
}

// ------ Tâches ------
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'

export interface Task {
  id: string
  user_id: string
  project_id?: string
  project?: Pick<Project, 'id' | 'name' | 'color'>
  client_id?: string
  client?: Pick<Client, 'id' | 'name'>
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  category?: string
  due_date?: string
  due_time?: string
  estimated_minutes?: number
  actual_minutes?: number
  is_recurring: boolean
  recurrence_rule?: string
  tags?: string[]
  created_at: string
  updated_at: string
  completed_at?: string
}

// ------ Événements Calendrier ------
export type EventSource = 'manual' | 'strava' | 'garmin' | 'google'

export interface CalendarEvent {
  id: string
  user_id: string
  task_id?: string
  project_id?: string
  title: string
  description?: string
  start_at: string
  end_at: string
  all_day: boolean
  category?: string
  color?: string
  location?: string
  source: EventSource
  external_id?: string
  created_at: string
}

// ------ Time Tracker ------
export interface TimeEntry {
  id: string
  user_id: string
  project_id?: string
  project?: Pick<Project, 'id' | 'name' | 'color'>
  client_id?: string
  client?: Pick<Client, 'id' | 'name'>
  task_id?: string
  task?: Pick<Task, 'id' | 'title'>
  description?: string
  category?: string
  started_at: string
  ended_at?: string
  duration_seconds?: number
  is_billable: boolean
  created_at: string
}

// ------ Santé ------
export interface HealthMetric {
  id: string
  user_id: string
  date: string
  weight_kg?: number
  body_fat?: number
  notes?: string
  created_at: string
}

export type RunningSource = 'manual' | 'strava' | 'garmin'

export interface RunningActivity {
  id: string
  user_id: string
  external_id?: string
  source: RunningSource
  title?: string
  date: string
  distance_km?: number
  duration_seconds?: number
  pace_sec_per_km?: number
  calories?: number
  heart_rate_avg?: number
  heart_rate_max?: number
  elevation_m?: number
  notes?: string
  raw_data?: Record<string, unknown>
  created_at: string
}

export interface TrainingPlan {
  id: string
  user_id: string
  name: string
  goal?: string
  start_date?: string
  end_date?: string
  is_active: boolean
  sessions?: TrainingSession[]
  created_at: string
}

export interface TrainingSession {
  week: number
  day: number
  type: string
  distance_km?: number
  duration_min?: number
  description?: string
  completed?: boolean
}

// ------ Recettes ------
export interface RecipeIngredient {
  name: string
  quantity: number
  unit: string
  optional?: boolean
}

export interface RecipeStep {
  order: number
  instruction: string
}

export interface Recipe {
  id: string
  user_id: string
  name: string
  description?: string
  prep_time?: number
  cook_time?: number
  servings: number
  calories?: number
  image_url?: string
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
  tags?: string[]
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface MealPlan {
  id: string
  user_id: string
  recipe_id: string
  recipe?: Pick<Recipe, 'id' | 'name' | 'image_url' | 'calories'>
  date: string
  meal_type: MealType
  servings: number
  notes?: string
  created_at: string
}

// ------ Courses ------
export type ShoppingListStatus = 'active' | 'completed' | 'archived'

export interface ShoppingList {
  id: string
  user_id: string
  name: string
  date?: string
  status: ShoppingListStatus
  total_estimated?: number
  total_actual?: number
  notes?: string
  created_at: string
}

export interface ShoppingItem {
  id: string
  user_id: string
  shopping_list_id: string
  recipe_id?: string
  name: string
  quantity?: number
  unit?: string
  category?: string
  price_estimated?: number
  price_actual?: number
  is_checked: boolean
  barcode?: string
  product_id?: string
  created_at: string
}

// ------ Budget ------
export type TransactionType = 'income' | 'expense'

export interface BudgetCategory {
  id: string
  user_id: string
  name: string
  type: TransactionType
  color?: string
  icon?: string
  budget_monthly?: number
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  budget_category_id?: string
  budget_category?: Pick<BudgetCategory, 'id' | 'name' | 'color' | 'icon'>
  project_id?: string
  shopping_list_id?: string
  amount: number
  type: TransactionType
  description?: string
  date: string
  is_recurring: boolean
  recurrence_rule?: string
  receipt_url?: string
  created_at: string
}

// ------ Intégrations ------
export type IntegrationProvider = 'strava' | 'garmin' | 'google_calendar'

export interface Integration {
  id: string
  user_id: string
  provider: IntegrationProvider
  access_token?: string
  refresh_token?: string
  expires_at?: string
  scope?: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ------ Utilitaires ------
export type DateRange = {
  from: Date
  to: Date
}

export type ChartDataPoint = {
  label: string
  value: number
  color?: string
}

export type StatCard = {
  label: string
  value: string | number
  unit?: string
  trend?: number
  color?: 'fiery' | 'cyan' | 'wheat' | 'teal'
}

export type DemandeStatut = 'nouvelle' | 'en_cours' | 'en_attente' | 'livree' | 'facturee' | 'annulee'
export type FichierCategorie = 'visuel' | 'facture' | 'brief' | 'autre'

export interface DemandeFichier {
  id: string
  user_id: string
  demande_id: string
  categorie: FichierCategorie
  filename: string
  file_path: string
  file_size?: number
  file_type?: string
  created_at: string
}

export interface Demande {
  id: string
  user_id: string
  client_id?: string
  client?: Pick<Client, 'id' | 'name' | 'ville'>
  titre: string
  demande?: string
  statut: DemandeStatut
  numero_facture?: string
  montant?: number
  date_demande?: string
  date_livraison?: string
  task_id?: string
  task?: Pick<Task, 'id' | 'title' | 'status'>
  project_id?: string
  project?: Pick<Project, 'id' | 'name'>
  /** Chemin relatif dans le Dropbox : les sources y restent, Nysa n'en garde que l'adresse. */
  dossier_dropbox?: string
  notes?: string
  fichiers?: DemandeFichier[]
  created_at: string
  updated_at?: string
}

export type EtatFichier = 'a_jour' | 'modifie' | 'changement_envoye'
export type CommandeEtiquetteStatut =
  'brouillon' | 'confirmee' | 'en_production' | 'recue' | 'annulee'
export type EtiquetteFichierCategorie = 'bat' | 'facture' | 'autre'

export interface EtiquetteGamme {
  id: string
  user_id: string
  nom: string
  ordre: number
  actif: boolean
  notes?: string
  created_at: string
  updated_at?: string
}

export interface EtiquetteFormat {
  id: string
  user_id: string
  gamme_id: string
  gamme?: Pick<EtiquetteGamme, 'id' | 'nom'>
  contenance: string
  /** Rang dans sa gamme : le tri alphabétique placerait « 120 ml » avant « 30 ml ». */
  ordre: number
  /** Une même contenance existe parfois en deux déclinaisons : 75 ml avec ou sans livret. */
  variante?: string
  dimensions?: string
  specification?: string
  actif: boolean
  created_at: string
  updated_at?: string
}

export interface Etiquette {
  id: string
  user_id: string
  format_id: string
  format?: EtiquetteFormat
  saveur: string
  /** EAN-13 du produit fini : le même parfum a un code par contenance. */
  code_barre?: string
  code_barre_note?: string
  etat_fichier: EtatFichier
  date_modification?: string
  derniere_commande?: string
  notes?: string
  created_at: string
  updated_at?: string
}

export interface EtiquetteCommandeLigne {
  id: string
  user_id: string
  commande_id: string
  etiquette_id: string
  etiquette?: Etiquette
  quantite: number
  /** Trace figée : le nouveau fichier est-il parti avec cette commande. */
  fichier_envoye: boolean
  created_at: string
}

export interface EtiquetteFichier {
  id: string
  user_id: string
  commande_id: string
  categorie: EtiquetteFichierCategorie
  filename: string
  file_path: string
  file_size?: number
  file_type?: string
  created_at: string
}

export interface EtiquetteCommande {
  id: string
  user_id: string
  reference?: string
  imprimeur?: string
  statut: CommandeEtiquetteStatut
  date_commande?: string
  date_reception?: string
  numero_facture?: string
  montant?: number
  notes?: string
  lignes?: EtiquetteCommandeLigne[]
  fichiers?: EtiquetteFichier[]
  created_at: string
  updated_at?: string
}
