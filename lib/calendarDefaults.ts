// Calendrier iCloud qui reçoit une session du time tracker quand aucun label
// n'est choisi. Le nom du projet ne sert pas de repli : « [AE] Site Web » ne
// correspond à aucun calendrier, et la route push retombait alors sur le
// premier calendrier iCloud (Dou&Dou).
// Partagé entre le client (time tracker) et les routes serveur (rapatriement).
export const DEFAULT_TIME_CALENDAR = 'Mixologue'
