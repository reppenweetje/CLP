import { project } from '../data/project.js'

// Bot-avatar voor de chat. Toont de initiaal van de bot-persona ("J" voor
// Jesse) op een midnite cirkel. Bewust niet de REPP-mark — die staat al
// in de header en zou in deze cirkelmaat (18x6px door SVG-aspect-ratio)
// lijken op willekeurige puntjes ipv een logo. De initiaal communiceert
// dat dit een persoon is, geen merkbutton — past bij chat-conventies
// (WhatsApp/Slack/iMessage) waar avatars persoonsmarkers zijn.
export default function Avatar() {
  const name = project?.salesTeam?.bot?.name || 'J'
  const initial = name.charAt(0).toUpperCase()
  return (
    <div className="shrink-0 w-7 h-7 mt-0.5 rounded-full bg-midnite flex items-center justify-center" aria-hidden="true">
      <span className="text-paper text-[12px] font-semibold leading-none tracking-tight">{initial}</span>
    </div>
  )
}
