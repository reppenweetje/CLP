// extracteert voornaam mailadres en eventueel 06 uit vrije tekst
// werkt zonder llm voor de demo straks vervangbaar door een echte ai call
// die ook nuance kan oppakken zoals tikfouten variaties of context

const EMAIL_RE = /([a-z0-9._+-]+)@([a-z0-9-]+\.[a-z0-9.-]+)/i
// strip alle spaties en streepjes uit de tekst voordat we hierop matchen
const PHONE_STRIPPED_RE = /(?:\+?316|06)\d{8}/
const FILLER_RE = /\b(ik|ben|heet|en|is|mijn|naam|email|mailadres|mail|adres|telefoon|nummer|tel|bereikbaar|op|via|kan|me|bellen|whatsappen|whatsapp|prima|hoor|hi|hallo|hoi|graag|gewoon|via|de|het|een|noem|met|maar|of|ook)\b/gi

function findPhone(originalText) {
  // strip alleen spaties en streepjes voor het matchen
  // andere karakters laten we staan zodat we de oorspronkelijke positie kunnen reconstructen
  const stripped = originalText.replace(/[\s-]/g, '')
  const m = stripped.match(PHONE_STRIPPED_RE)
  if (!m) return { match: null, normalized: null }
  let n = m[0]
  if (n.startsWith('316')) n = '+' + n
  return { match: m[0], normalized: n }
}

function stripPhoneFromText(text) {
  // verwijder alle vormen van het telefoonnummer uit de oorspronkelijke tekst
  // zodat we de naam erna kunnen extracten
  return text.replace(/(?:\+?\s*31\s*6|0\s*6)[\s\-\d]{8,}/g, ' ')
}

function capitalize(name) {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

export function parseLeadInput(text) {
  const original = text || ''
  const emailMatch = original.match(EMAIL_RE)
  const phoneInfo = findPhone(original)

  let remaining = original
  if (emailMatch) remaining = remaining.replace(emailMatch[0], ' ')
  remaining = stripPhoneFromText(remaining)
  remaining = remaining.replace(FILLER_RE, ' ').replace(/[,.!?;:()"']/g, ' ').replace(/\s+/g, ' ').trim()

  // eerste woord in de overgebleven tekst dat eruitziet als een naam
  const nameMatch = remaining.match(/[a-zA-ZÀ-ÿ]{2,}/)

  return {
    firstName: nameMatch ? capitalize(nameMatch[0]) : null,
    email: emailMatch ? emailMatch[0].toLowerCase() : null,
    phone: phoneInfo.normalized,
  }
}

// merge nieuwe velden in een bestaande draft alleen als de nieuwe niet null
export function mergeLead(draft, parsed) {
  return {
    firstName: parsed.firstName || draft.firstName || null,
    email: parsed.email || draft.email || null,
    phone: parsed.phone || draft.phone || null,
  }
}

// welke velden ontbreken nog
export function missingLeadFields(lead, requirePhone = false) {
  const missing = []
  if (!lead.firstName) missing.push('firstName')
  if (!lead.email) missing.push('email')
  if (requirePhone && !lead.phone) missing.push('phone')
  return missing
}
