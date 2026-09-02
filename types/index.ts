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
  created_at: string
}

// ------ Santé ------
// ------ Recettes ------
// ------ Courses ------
// ------ Budget ------
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
  'brouillon' | 'confirmee' | 'passee' | 'en_production' | 'recue' | 'annulee'
export type EtiquetteDocCategorie = 'bat' | 'facture' | 'bl' | 'devis' | 'autre'

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

/**
 * Un document de commande : facture, bon de livraison, BAT, devis.
 *
 * Le PDF est facultatif — on saisit souvent le numéro avant de recevoir la
 * pièce, et une commande donne plusieurs factures comme plusieurs BL.
 */
export interface EtiquetteDocument {
  id: string
  user_id: string
  commande_id: string
  categorie: EtiquetteDocCategorie
  numero?: string
  date_document?: string
  montant?: number
  notes?: string
  filename?: string
  file_path?: string
  file_size?: number
  file_type?: string
  created_at: string
}

export interface EtiquetteCommande {
  id: string
  user_id: string
  reference?: string
  imprimeur?: string
  /** La personne à qui le message s'adresse : jamais un service. */
  contact?: string
  /** Dossier d'archive de la commande, relatif à la racine de l'archive. */
  dossier?: string
  statut: CommandeEtiquetteStatut
  date_commande?: string
  date_reception?: string
  notes?: string
  lignes?: EtiquetteCommandeLigne[]
  documents?: EtiquetteDocument[]
  created_at: string
  updated_at?: string
}
