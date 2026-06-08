// Per-project prompt-config voor de gemini-followup Edge Function.
//
// Eén shared SYSTEM_PROMPT-bouwer in prompt.ts gebruikt deze configs zodat
// nieuwe projecten alleen een config-object hoeven toe te voegen, geen
// duplicaat van de hele prompt-tekst. De buildPrompt() routeert op
// snapshot.project_name (= source-veld in public.leads, dus exact
// "clp_dehofman" of "Paveri BUnit" enz).
//
// Bij nieuwe projecten:
//  1. Voeg een ProjectPromptConfig toe (zie HOFMAN/PAVERI hieronder).
//  2. Registreer 'em in CONFIGS met de exacte source-string als sleutel.
//  3. Test via `deno run` met een snapshot zoals onderaan deze file
//     beschreven, of via een echte lead in de leads-tabel.

export interface ProjectPromptConfig {
  // Hoe het project in zinnen voorkomt: "info van De Paveri opgevraagd".
  project_name: string

  // Stad — gebruikt in algemene zinnen + context. "Haarlem" / "Assendelft".
  city: string

  // Wijk/bedrijventerrein — gebruikt in prijs-context en locatie-route.
  // Voorbeeld De Hofman: "Waarderpolder". Voorbeeld De Paveri:
  // "Assendelft Noord".
  area_label: string

  // Hoe we ROUTE 2 regel 4 verwoorden — vermijd "twee units" als dat niet
  // klopt. Voorbeelden:
  //  De Hofman: "twee units"
  //  De Paveri: "enkele Type C-units"
  units_left_phrase: string

  // Per-m²-prijszin gebruikt in ROUTE 1 (afhaak=prijs). Inclusief context-
  // alinea-rest. Voorbeeld De Hofman: "Met circa €2.250 per m² ligt De
  // Hofman relatief scherp ten opzichte van recente 2-laags nieuwbouw
  // bedrijfsunits in de Waarderpolder."
  price_route_sentence: string

  // Locatie-route sluitzin: per project iets specifieker. Default werkt
  // ook prima maar Paveri kan bv. "in welke regio of plaats zou een
  // bedrijfsunit wél beter bij je passen?" hetzelfde houden.
  location_route_question: string

  // Locatie-route opening — Paveri verwijst naar Assendelft Noord, Hofman
  // naar Waarderpolder. Default-template gebruikt area_label automatisch.
  // Specifiek per project alleen overschrijven als de zin anders moet.
  location_route_sentence?: string

  // Vertaling van interne size_id naar wat de lead krijgt te lezen. Per
  // project anders omdat de flow-vragen verschillen. Lege string = niet
  // benoemen (zelfde gedrag als weet_niet).
  size_translations: Record<string, string>

  // Optioneel — vertaling van rentRange voor afhaak=huur. Alleen relevant
  // als het project een huur-pad heeft (De Hofman wel, De Paveri niet).
  rent_range_translations?: Record<string, string>
}

// ── De Hofman ───────────────────────────────────────────────────────────────
// Bestaande productie-config — eerder hardcoded in prompt.ts staan. Niet
// aanraken zonder afstemming want de huidige WhatsApp-uitstroom hangt
// hieraan vast.
export const HOFMAN_CONFIG: ProjectPromptConfig = {
  project_name: 'De Hofman',
  city: 'Haarlem',
  area_label: 'Waarderpolder',
  units_left_phrase: 'twee units',
  price_route_sentence: 'Met circa €2.250 per m² ligt De Hofman relatief scherp ten opzichte van recente 2-laags nieuwbouw bedrijfsunits in de Waarderpolder.',
  location_route_question: 'In welke regio of plaats zou een bedrijfsunit wél beter bij je passen?',
  size_translations: {
    tot_50:       '100 m² (50 m² BG)',
    rond_100:     '200 m² (100 m² BG)',
    meer_dan_100: 'meer dan 200 m² (meer dan 100 m² BG)',
    weet_niet:    '',
  },
  rent_range_translations: {
    tot_1500:    'tot €1.500 per maand',
    '1500_2500': 'tussen €1.500 en €2.500 per maand',
    '2500_4000': 'tussen €2.500 en €4.000 per maand',
    meer_4000:   'meer dan €4.000 per maand',
    weet_niet:   '',
  },
}

// ── De Paveri ───────────────────────────────────────────────────────────────
// Casco bedrijfsunits in Assendelft Noord. Type A en B uitverkocht, Type D
// bijna vergeven (2 sold-ov), Type C nog 4 concreet beschikbaar. CLP-flow
// stuurt alle size-keuzes naar Type C (zie paveri.js recommendIntroByChoice).
//
// Prijszin geeft eerlijke spread (Type D vanaf €1.785/m², Type C €1.713/m²)
// in plaats van één getal — bezoekers hebben sowieso de prijslijst gezien.
// Vrij-op-naam noemen we expliciet als unieke USP versus bestaande bouw.
export const PAVERI_CONFIG: ProjectPromptConfig = {
  project_name: 'De Paveri',
  city: 'Assendelft',
  area_label: 'Assendelft Noord',
  units_left_phrase: 'enkele Type C-units',
  price_route_sentence: 'Met circa €1.713 per m² voor Type C en €1.785 per m² voor Type D ligt De Paveri scherp voor casco nieuwbouw in de Zaanstreek, inclusief eigen parkeerterrein. Levering is bovendien vrij op naam, dus geen 10,4% overdrachtsbelasting zoals bij bestaande bouw.',
  location_route_question: 'In welke regio of plaats zou een bedrijfsunit wél beter bij je passen?',
  // Size-vertalingen bewust kort gehouden zodat de 400-char-limiet niet
  // wordt overschreden. Type A en B uitverkocht-context staat impliciet
  // in de CTA-zin ("nog enkele Type C-units beschikbaar") — daar leidt
  // around_208 de bezoeker dus naar zonder dat we het hier hoeven uit
  // te leggen.
  size_translations: {
    around_112: '112 m² (Type D)',
    around_178: '178 m² (Type C)',
    around_208: 'rond 200 m²',
    weet_niet:  '',
  },
  // Geen rent_range_translations: De Paveri-flow heeft geen huur-pad.
}

// ── ELSTER 11 ─────────────────────────────────────────────────────────────
// 15 casco bedrijfsunits aan de Veenendaalsestraatweg 11 in Elst (Utrecht),
// strategisch aan de A12. Type A (~68 m², vanaf €135.000), Type B (90-115 m²,
// vanaf €175.000) en Type C (150-310 m², vanaf €300.000, deels met verdieping).
// Units 1, 2, 8 en 9 verkocht; 11 nog beschikbaar. Geen huur-pad en geen
// financieringspartner, dus geen rent_range_translations.
export const ELSTER_CONFIG: ProjectPromptConfig = {
  project_name: 'ELSTER 11',
  city: 'Elst',
  area_label: 'Veenendaalsestraatweg / A12',
  units_left_phrase: '11 units in Type A, B en C',
  price_route_sentence: 'Met circa €1.985 per m² voor Type A en vanaf €300.000 voor de ruime Type C-units ligt ELSTER 11 scherp voor casco nieuwbouw aan de A12, inclusief eigen parkeerplaats. Levering is vrij op naam, exclusief 21% btw.',
  location_route_question: 'In welke regio of plaats zou een bedrijfsunit wél beter bij je passen?',
  size_translations: {
    around_70:  'rond 70 m² (Type A)',
    around_100: '90 tot 115 m² (Type B)',
    around_200: '150 tot 310 m² (Type C)',
    weet_niet:  '',
  },
  // Geen rent_range_translations: ELSTER 11-flow heeft geen huur-pad.
}

// Source-string (= public.leads.source = project.crmProject) → config.
// Sleutels moeten exact matchen met wat de frontend stuurt.
const CONFIGS: Record<string, ProjectPromptConfig> = {
  clp_dehofman:   HOFMAN_CONFIG,
  'Paveri BUnit': PAVERI_CONFIG,
  'Elst BUnit':   ELSTER_CONFIG,
}

// Fallback voor onbekende project-keys: De Hofman. Dat is de oudste config
// en heeft de meest dekkende afhaak-routes. Wanneer een nieuwe lead met
// onbekende source binnenkomt krijgt de bezoeker dus een Hofman-bericht;
// dat is verkeerd-maar-niet-stuk en blijft loggen in de leads-tabel zodat
// we ontdekken dat we een nieuwe project-config moeten registreren.
export function pickProjectConfig(project_name?: string | null): ProjectPromptConfig {
  if (project_name && CONFIGS[project_name]) return CONFIGS[project_name]
  return HOFMAN_CONFIG
}
