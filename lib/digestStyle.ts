// Mappings couleur/icône pour le rendu structuré des digests (Brief).
// Couleurs choisies pour rester lisibles en thème clair ET sombre.

import {
  Activity, AlertCircle, AlertTriangle, Award, BarChart2, Bell, Calendar, Check, CheckCircle2,
  CheckSquare, Circle, Clock, Database, DollarSign, Download, Droplets, Eye, FolderKanban, Flame,
  Heart, HeartPulse, Home, Info, Link2, List, Lock, MapPin, Moon, Package, PenLine, Play, Search,
  Send, Settings, Shield, ShoppingCart, Sparkles, Star, Store, Sun, Tag, Target, TrendingDown,
  TrendingUp, Upload, User, Users, Utensils, Wallet, Wind, Zap,
} from '@/components/ui/icons'

type IconType = typeof Circle

// ── Tonalités ────────────────────────────────────────────────────────────
export const TONE_COLOR: Record<string, string> = {
  neutral: '#6b7280', success: '#16a34a', warning: '#d97706', danger: '#dc2626', accent: 'var(--azul)',
}
export const toneColor = (t?: string) => TONE_COLOR[t ?? 'neutral'] ?? TONE_COLOR.neutral

// ── Priorités ────────────────────────────────────────────────────────────
export const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#dc2626', high: '#d97706', medium: 'var(--azul)', low: '#6b7280',
}
export const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'Urgent', high: 'Haute', medium: 'Moyenne', low: 'Basse',
}
export const priorityColor = (p?: string) => PRIORITY_COLOR[p ?? 'low'] ?? PRIORITY_COLOR.low

// ── Marques (couleur stable par marque, partout) ─────────────────────────
export const BRAND_COLOR: Record<string, string> = {
  'Le Mixologue': '#e8663d',
  'E-Smoker':     '#9b59b6',
  'Aeterna':      '#5a8f3a',
  'Transverse':   '#12b5a5',
  'Interne':      '#6366f1',
}
export const brandColor = (b?: string) => (b && BRAND_COLOR[b]) || '#6b7280'

// ── Icônes Tabler (nom) → adaptateur d'icônes NYSA, avec repli ───────────
const ICON_MAP: Record<string, IconType> = {
  checklist: CheckSquare, 'list-check': CheckSquare, check: Check, 'circle-check': CheckCircle2,
  'square-check': CheckSquare, list: List, notes: PenLine, note: PenLine, 'file-text': PenLine, pencil: PenLine, edit: PenLine,
  flame: Flame, fire: Flame, bolt: Zap, zap: Zap, flash: Zap, rocket: Zap,
  'alert-triangle': AlertTriangle, alert: AlertTriangle, warning: AlertTriangle,
  'alert-circle': AlertCircle, 'exclamation-circle': AlertCircle, 'exclamation-mark': AlertCircle, info: Info,
  bell: Bell, calendar: Calendar, 'calendar-event': Calendar, clock: Clock, hourglass: Clock,
  'trending-up': TrendingUp, 'arrow-up-right': TrendingUp, 'trending-down': TrendingDown, 'arrow-down-right': TrendingDown,
  'chart-bar': BarChart2, chart: BarChart2, 'chart-line': BarChart2, target: Target, focus: Target,
  flag: Tag, tag: Tag, bookmark: Tag, star: Star, 'star-filled': Star, award: Award, trophy: Award,
  users: Users, user: User, 'user-circle': User, 'building-store': Store, store: Store, shopping: ShoppingCart, 'shopping-cart': ShoppingCart,
  package: Package, box: Package, 'package-import': Download, 'package-export': Upload,
  coin: DollarSign, 'currency-euro': DollarSign, 'currency-dollar': DollarSign, cash: DollarSign, wallet: Wallet, 'pig-money': Wallet,
  heart: Heart, 'heart-rate-monitor': HeartPulse, activity: Activity, pulse: Activity, 'device-heartbeat': HeartPulse,
  bulb: Sparkles, 'bulb-filled': Sparkles, sparkles: Sparkles, sparkle: Sparkles,
  shield: Shield, 'shield-check': Shield, lock: Lock, settings: Settings, 'settings-2': Settings, adjustments: Settings,
  home: Home, search: Search, mail: Send, send: Send, message: Send, link: Link2, 'external-link': Link2,
  download: Download, upload: Upload, droplet: Droplets, 'droplet-filled': Droplets, wind: Wind,
  moon: Moon, sun: Sun, sunrise: Sun, sunset: Moon, scale: BarChart2, database: Database, eye: Eye,
  briefcase: FolderKanban, folder: FolderKanban, 'folder-open': FolderKanban, map: MapPin, 'map-pin': MapPin, pin: MapPin,
  utensils: Utensils, tools: Settings, play: Play, coffee: Sun,
}

/** Composant d'icône pour un nom Tabler (tolérant : préfixe/casse/underscores). */
export function digestIcon(name?: string): IconType {
  if (!name) return Circle
  const key = name.toLowerCase().replace(/^tabler[-_]?/, '').replace(/[_\s]+/g, '-').replace(/-outline$/, '')
  return ICON_MAP[key] ?? Circle
}
