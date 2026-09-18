import 'dotenv/config'
import { alerter } from './alertes.js'

/**
 * `node dist/alerte-cli.js "message"` — appelé par systemd (OnFailure) quand
 * un service tombe pour de bon. Le message dit quel service et où regarder.
 */
const message = process.argv.slice(2).join(' ').trim()
if (!message) {
  console.error('Usage : alerte-cli "message"')
  process.exit(2)
}
alerter(message).then(ok => process.exit(ok ? 0 : 1))
