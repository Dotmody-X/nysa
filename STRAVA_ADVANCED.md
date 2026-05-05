# 🏃 Strava Advanced Integration — Détails km-par-km

## Features Nouvelles

### 1️⃣ **Synchronisation Complète (All-Time)**
```bash
POST /api/strava/sync-history
```
- Importe **TOUT l'historique** Strava (pas de limite de date)
- Récupère les activités par page (200 max par page)
- Peut prendre quelques minutes pour la première sync
- Rate limit Strava: ~100 requêtes/15 min

### 2️⃣ **Détails km-par-km (Streams)**
Strava fournit 2 types de données:
- **Activities API** = résumé (distance, durée, allure, FC moyenne, etc.)
- **Streams API** = granulaire (point-par-point: time, distance, altitude, HR, cadence, power, etc.)

On a maintenant les **Streams** qui sont parsés en segments km-par-km.

### 3️⃣ **Table activity_segments**
```sql
CREATE TABLE activity_segments (
  id, user_id, activity_id,
  km_index, km_start, km_end,
  time_seconds, altitude_start, altitude_end, elevation_gain,
  pace_sec_per_km, heart_rate_avg/min/max, cadence_avg,
  power_avg, temperature_avg, grade_avg,
  lat_start, lon_start, lat_end, lon_end
)
```

Chaque activité a **N segments** = 1 par km complété

### 4️⃣ **Page Détail Améliorée**
Pour chaque activité (`/sport/[id]`):

**Avant:**
```
Distance | Durée | Allure moy | FC moy | D+ | Carte
```

**Maintenant:**
```
Distance | Durée | Allure moy | FC moy | D+ | Carte

▼ DÉTAILS STRAVA (km-par-km)
  📊 Graphiques interactifs: Allure, FC, Cadence, Puissance, Pente
  📋 Tableau complet: Km 0, 1, 2, ... N avec toutes les metrics
  🎯 Click un km = voir le détail complet (temps, alt, HR min/max, etc.)
```

---

## Setup

### 1. Créer la table activity_segments

Va sur https://app.supabase.com → Project → SQL Editor

Copie-colle le contenu de `supabase/activity_segments.sql` et exécute.

### 2. Première Synchronisation

Depuis NYSA, appelle:
```javascript
fetch('/api/strava/sync-history', { method: 'POST' })
  .then(r => r.json())
  .then(data => console.log(data))
```

Response:
```json
{
  "success": true,
  "activities_imported": 42,
  "activities_upserted": 42,
  "segments_imported": 847,
  "errors": null
}
```

⏳ **Durée**: ~2-5 minutes selon le nombre d'activités

### 3. Vérify en BDD

```sql
SELECT COUNT(*) FROM running_activities WHERE source = 'strava';
SELECT COUNT(*) FROM activity_segments;
-- Devrait avoir plus de segments que d'activités (1 segment par km)
```

---

## Données Disponibles par Segment

| Donnée | Format | Note |
|--------|--------|------|
| **km_index** | int | 0, 1, 2, ... |
| **pace_sec_per_km** | float | secondes par km pour ce segment |
| **heart_rate_avg/min/max** | int | bpm, null si pas de capteur HR |
| **cadence_avg** | int | rpm, null si pas de capteur |
| **power_avg** | int | watts, null si pas de capteur électrique |
| **temperature_avg** | int | °C, null si pas dispo |
| **grade_avg** | float | pente moyenne %, positif = montée |
| **elevation_gain** | int | D+ en mètres pour ce km |
| **altitude_start/end** | int | mètres |
| **lat_start/lon_start** | float | géolocalisation du début |
| **lat_end/lon_end** | float | géolocalisation de la fin |
| **time_seconds** | int | durée totale de ce km |

---

## Composants React

### useActivitySegments Hook
```typescript
const { segments, loading, error } = useActivitySegments(activityId)
// segments: ActivitySegment[]
```

### SegmentDetails Component
```jsx
<SegmentDetails segments={segments} />
// Affiche: graphiques + tableau + détail
```

---

## Features Avancées

### 📊 Graphiques Interactifs
- Sélectionner une métrique (Allure, FC, Cadence, Puissance, Pente)
- Click sur une barre = voir le détail du km
- Couleur change si km sélectionné

### 📋 Tableau Détail
Colonnes: km | Allure | FC | Cadence | Pente | D+ | Temps

Sortable, colorée:
- Allure rapide = 🔵 Teal
- Allure lente = 🔴 Orange
- Montée = 🔴 Orange
- Descente = 🔵 Teal

### 🎯 Detail View
Click un km → affiche toutes les données (HR min/max, puissance, température, etc.)

---

## Streaming Strava API

Strava streams disponibles:
- ✅ `time` — temps en secondes
- ✅ `distance` — distance en mètres
- ✅ `latlng` — coordonnées GPS
- ✅ `altitude` — altitude en mètres
- ✅ `heartrate` — fréquence cardiaque (si capteur)
- ✅ `cadence` — cadence en RPM
- ✅ `watts` — puissance en watts (si capteur électrique)
- ✅ `temp` — température
- ✅ `grade_smooth` — pente lissée %
- ⚠️ `moving` — peut être utilisé pour filtrer pauses

Rate limit: ~100 requêtes / 15 minutes

---

## Données Manquantes?

**Si tu vois "Pas de données détaillées":**

1. L'activité n'a pas encore été syncée (relance `/api/strava/sync-history`)
2. L'activité a peut-être été téléchargée manuellement sans upload GPS
3. Les streams n'étaient pas disponibles du côté Strava

**Si tu vois des données partielles (e.g. pas de HR):**
- C'est normal! Les capteurs ne sont pas toujours disponibles
- HR = null si pas de capteur HR connecté à Strava
- Power = null si pas de power meter
- On affiche "—" quand c'est null

---

## Future Enhancements

🚀 **Phase 2:**
- Export segments en CSV/JSON
- Comparaison entre runs (e.g. même parcours)
- Heatmap: km le plus lent
- Calories brûlées (si Strava fournit)
- Intégration avec Apple Health / Google Fit

🚀 **Phase 3:**
- IA analysis: "Tu cours plus vite les mardis", "Ta FC est élevée", etc.
- Recommendations basées sur patterns
- Goal tracking: progression allure
- Social: share segments avec d'autres runners

---

## References

- **Strava API Docs:** https://developers.strava.com/docs/reference/
- **Streams Endpoint:** `GET /api/v3/activities/{id}/streams`
- **Rate Limits:** 600 req/15min (600/100) per token
- **OAuth Scopes:** Nous utilisons `activity:read_all` pour accès complet

---

**Created:** 2026-05-05
**Status:** ✅ LIVE
**Tested:** All segments parsing verified
