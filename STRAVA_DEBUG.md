# 🔍 Debugging Strava Data

## Why Missing Data?

Strava ne fournit **pas toujours** toutes les données:

| Donnée | Disponible Si... | Notes |
|--------|-----------------|-------|
| **Allure** | ✅ Toujours | Calculé depuis distance + time |
| **FC (HR)** | ⚠️ Si capteur HR | Montre/Garmin/Wahoo = OUI, sinon NON |
| **Cadence** | ⚠️ Si capteur cadence | Garmin/Wahoo = OUI, Apple Watch = PEUT-ÊTRE |
| **Puissance (watts)** | ⚠️ Si power meter | Rare! Nécessite capteur électrique |
| **Température** | ⚠️ Si data Strava | Pas toujours fourni |
| **Pente/Grade** | ✅ Souvent | Calculé depuis altitude + distance |
| **Altitude** | ✅ Souvent | Garmin/Wahoo = OUI |

---

## Debug: Voir Exactement ce que Strava Donne

### Step 1: Récupère une activité avec segments

Va à `/sport` → Clique une activité → Note l'ID dans l'URL

```
https://nysa.com/sport/123abc456def
                           ^^^^^^^^^^ = activity ID
```

### Step 2: Appelle le debug endpoint

Ouvre la console (F12) et exécute:

```javascript
const activityId = 'ce35ab12-e234-4f5e-a3f0-b1c2d3e4f5a6' // Remplace par ton ID

fetch(`/api/strava/debug?activityId=${activityId}`)
  .then(r => r.json())
  .then(data => {
    console.log('🔍 ANALYSIS:')
    console.table(data.analysis.data_points)
    console.log('\n📋 Raw streams:', data.raw_streams)
  })
```

### Step 3: Vérify les données

Regarde le tableau:

```
stream     | count | first3        | hasMissing
-----------|-------|---------------|----------
time       | 1247  | [0, 1, 2]     | false
distance   | 1247  | [0, 45, 89]   | false
altitude   | 1247  | [45, 46, 47]  | false
heartrate  | 1247  | [145, 148, 150] | false
cadence    | 0     | []            | — (NOT AVAILABLE)
watts      | 0     | []            | — (NOT AVAILABLE)
temp       | 1247  | [18, 18, 18]  | false
```

**Explication:**
- ✅ `time`, `distance`, `altitude`, `heartrate`, `temp` = Disponible
- ❌ `cadence`, `watts` = Strava n'a pas fourni (=device doesn't have sensors)

---

## Why Some Data Missing After Sync?

### Scenario 1: Activity uploaded without GPS device
```
❌ Pas d'altitude
❌ Pas de latlng
✅ Juste distance + durée (manuel entry)
```

### Scenario 2: Activity from Apple Watch (no cadence)
```
✅ Distance, durée, HR
❌ Cadence (Apple Watch doesn't track)
❌ Watts (no power meter)
✅ Altitude (calculated from air pressure)
```

### Scenario 3: Activity from Garmin (full data)
```
✅ Distance, durée, HR, Cadence, Altitude
❌ Watts (unless power meter attached)
✅ Temperature, Grade
```

---

## If Data is Still Missing

### Option 1: Check what Strava actually stored

Va à https://strava.com → Activity → Look at the stats shown

**If Strava Web doesn't show it = Strava didn't record it**

### Option 2: Check our parsing

```javascript
// En console:
fetch(`/api/strava/debug?activityId=${id}`)
  .then(r => r.json())
  .then(data => {
    const hasHeartrate = data.raw_streams.heartrate?.data?.length > 0
    const hasCadence = data.raw_streams.cadence?.data?.length > 0
    const hasWatts = data.raw_streams.watts?.data?.length > 0
    
    console.log('HR?', hasHeartrate)
    console.log('Cadence?', hasCadence)
    console.log('Watts?', hasWatts)
  })
```

**If debug shows data but segment doesn't = Bug in parsing**

### Option 3: Check Supabase directly

```sql
SELECT 
  km_index,
  pace_sec_per_km,
  heart_rate_avg,
  cadence_avg,
  power_avg,
  temperature_avg
FROM activity_segments
WHERE activity_id = 'YOUR_ACTIVITY_ID'
LIMIT 5;
```

Look at the values. If all NULL/0 = parsing issue.

---

## Known Issues & Fixes

### Issue: HR shows but is 0
**Cause:** Strava provided HR but it's all 0 (bad recording)
**Fix:** Check original activity on Strava.com

### Issue: Cadence null even though device has sensor
**Cause:** Garmin/Wahoo didn't record cadence for that activity
**Fix:** Check activity details on Strava.com

### Issue: Altitude has values but looks wrong
**Cause:** GPS drift during activity
**Fix:** Normal! Strava's elevation is calculated from altitude + barometer

### Issue: Temperature shows -99
**Cause:** Parsing error or missing data
**Fix:** We now filter out impossible temps (<-50°C)

---

## UI Handling of Missing Data

Current behavior:
- ❌ Missing/0 data = Shows "—" (dash)
- ✅ Non-zero data = Shows value with unit
- 🎨 Color only applies if data exists

Example:
```
Cadence: —     (if no sensor)
Cadence: 92    (if available)
Power: —       (if no power meter)
Power: 285 W   (if available)
```

---

## If Sync Failed Partially

Re-run sync (it upserts, so safe to repeat):

```javascript
fetch('/api/strava/sync-history', { method: 'POST' })
  .then(r => r.json())
  .then(data => console.log(data))
```

This will:
- ✅ Import new activities
- ✅ Update existing with new data
- ✅ Re-fetch streams for all activities
- ❌ Not delete anything

---

## Next Steps for Nathan

1. **Run the debug endpoint** for 2-3 activities
2. **Check what Strava provides** in each case
3. **Tell me:** 
   - What data IS showing up?
   - What data should but isn't?
   - Is it Strava's fault or our parsing?

Then I can fix either:
- The parsing logic (if we're not reading Strava data correctly)
- The sync (if we're not asking Strava for all available data)

---

**Created:** 2026-05-05
**Status:** Troubleshooting guide
