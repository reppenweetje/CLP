export interface HashInput {
  persona?: string | null
  intent_id?: string | null
  size_id?: string | null
  timeline_id?: string | null
  afhaak_reason?: string | null
  financing_interest?: boolean | null
  brochure_requested?: boolean | null
  email?: string | null
  first_name?: string | null
}

const HASH_KEYS: ReadonlyArray<keyof HashInput> = ['persona','intent_id','size_id','timeline_id','afhaak_reason','financing_interest','brochure_requested','email','first_name']

function canonical(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? '1' : '0'
  return String(value).trim().toLowerCase()
}

export function buildCanonicalString(input: HashInput): string {
  return HASH_KEYS.map(k => `${k}=${canonical(input[k])}`).join('\n')
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function buildHash(input: HashInput): Promise<string> {
  return sha256Hex(buildCanonicalString(input))
}
