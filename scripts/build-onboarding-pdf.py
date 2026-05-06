"""Genereert een 2-pagina PDF voor REPP-collegas met de stappen om een
nieuw CLP-project op te starten. Output: public/clp-nieuw-project.pdf."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether,
)
from reportlab.platypus.flowables import HRFlowable
from reportlab.lib.enums import TA_LEFT
from pathlib import Path

INK = HexColor("#1d1d1f")
INK_SOFT = HexColor("#6b6a66")
INK_MUTE = HexColor("#9a9893")
MIDNITE = HexColor("#0f0f70")
GOLD = HexColor("#c9a45c")
CANVAS_2 = HexColor("#efeee8")
MIST_LIGHT = HexColor("#ebeae5")

OUT = Path(
    "/Users/jbgoedel/Library/Mobile Documents/com~apple~CloudDocs/Claude Code/"
    "CLP/public/clp-nieuw-project.pdf"
)

styles = {
    "eyebrow": ParagraphStyle(
        "eyebrow", fontName="Helvetica-Bold", fontSize=7, textColor=MIDNITE,
        spaceAfter=3, leading=9,
    ),
    "h1": ParagraphStyle(
        "h1", fontName="Helvetica-Bold", fontSize=20, textColor=INK,
        spaceAfter=4, leading=23,
    ),
    "lead": ParagraphStyle(
        "lead", fontName="Helvetica", fontSize=9.5, textColor=INK,
        spaceAfter=8, leading=13,
    ),
    "h2": ParagraphStyle(
        "h2", fontName="Helvetica-Bold", fontSize=11, textColor=INK,
        spaceBefore=10, spaceAfter=4, leading=14,
    ),
    "body": ParagraphStyle(
        "body", fontName="Helvetica", fontSize=9, textColor=INK_SOFT,
        spaceAfter=2, leading=12.5,
    ),
    "body_ink": ParagraphStyle(
        "body_ink", fontName="Helvetica", fontSize=9, textColor=INK,
        spaceAfter=2, leading=12.5,
    ),
    "step_num": ParagraphStyle(
        "step_num", fontName="Helvetica-Bold", fontSize=10, textColor=MIDNITE,
        leading=13,
    ),
    "step_title": ParagraphStyle(
        "step_title", fontName="Helvetica-Bold", fontSize=9.5, textColor=INK,
        leading=12.5, spaceAfter=1,
    ),
    "step_body": ParagraphStyle(
        "step_body", fontName="Helvetica", fontSize=8.5, textColor=INK_SOFT,
        leading=11.5, spaceAfter=2,
    ),
    "foot": ParagraphStyle(
        "foot", fontName="Helvetica", fontSize=8, textColor=INK_MUTE,
        leading=11, alignment=TA_LEFT,
    ),
}


def gold_line():
    return HRFlowable(
        width=170 * mm, thickness=0.5, color=GOLD,
        spaceBefore=2, spaceAfter=6,
    )


def step_block(num, title, body):
    cell_num = Paragraph(str(num), styles["step_num"])
    body_para = [Paragraph(title, styles["step_title"])]
    if isinstance(body, list):
        for line in body:
            body_para.append(Paragraph(line, styles["step_body"]))
    else:
        body_para.append(Paragraph(body, styles["step_body"]))
    return Table(
        [[cell_num, body_para]],
        colWidths=[8 * mm, 162 * mm],
        style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]),
    )


def checklist_box(items):
    rows = []
    for it in items:
        rows.append([
            Paragraph('<font color="#c9a45c">&#x25C6;</font>', styles["body_ink"]),
            Paragraph(it, styles["body_ink"]),
        ])
    return Table(
        rows, colWidths=[8 * mm, 162 * mm],
        style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("BACKGROUND", (0, 0), (-1, -1), CANVAS_2),
        ]),
    )


def two_col_table(rows, col1_width=70):
    return Table(
        [[Paragraph(a, styles["body_ink"]), Paragraph(b, styles["body"])] for a, b in rows],
        colWidths=[col1_width * mm, (170 - col1_width) * mm],
        style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("LINEBELOW", (0, 0), (-1, -2), 0.4, MIST_LIGHT),
        ]),
    )


def header_footer(canv, doc):
    canv.saveState()
    canv.setFont("Helvetica", 7.5)
    canv.setFillColor(INK_MUTE)
    canv.drawString(20 * mm, 12 * mm, "REPP CLP - nieuw project opstarten")
    canv.drawRightString(190 * mm, 12 * mm, f"pagina {doc.page}")
    canv.setStrokeColor(GOLD)
    canv.setLineWidth(0.4)
    canv.line(20 * mm, 16 * mm, 190 * mm, 16 * mm)
    canv.restoreState()


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=15 * mm, bottomMargin=20 * mm,
        title="REPP CLP - nieuw project opstarten",
        author="REPP",
    )

    s = []

    # Pagina 1
    s.append(Paragraph("CONVERSATIONAL LANDING PAGE - ONBOARDING", styles["eyebrow"]))
    s.append(Paragraph("Nieuw CLP-project opstarten", styles["h1"]))
    s.append(Paragraph(
        "Deze repo is een GitHub-template. Klonen, content invullen, deployen. "
        "Met Claude Code als wizard kost het 30 tot 45 minuten voor een project dat op "
        "De Hofman lijkt, en 1,5 tot 2 uur als de structuur afwijkt.",
        styles["lead"],
    ))
    s.append(gold_line())

    s.append(Paragraph("Voor je begint, verzamel", styles["h2"]))
    s.append(checklist_box([
        "Projectnaam plus 1-zin tagline",
        "Aantal units, m&#178; en prijs vanaf per type",
        "Telefoonnummer plus WhatsApp-nummer; brochure als PDF",
        "6 sfeerbeelden plus 1 hero-foto plus 1 foto per unit-type",
        "Naam van de collega die belt",
    ]))

    s.append(Paragraph("De 8 stappen", styles["h2"]))

    s.append(step_block(
        1, "Maak een nieuwe repo van de template",
        'Ga naar <font face="Courier">github.com/reppenweetje/CLP</font>, klik '
        "<b>Use this template</b> en maak een nieuw priv&#233;-repo aan, "
        'bijvoorbeeld <font face="Courier">clp-jouwproject</font>.'
    ))

    s.append(step_block(
        2, "Kloon lokaal en installeer dependencies",
        'In de terminal: <font face="Courier">gh repo clone reppenweetje/clp-jouwproject</font>, '
        'dan <font face="Courier">cd clp-jouwproject</font> en <font face="Courier">npm install</font>.'
    ))

    s.append(step_block(
        3, "Open Claude Code in de map",
        'Type <font face="Courier">claude</font> in de project-map en wacht tot de sessie laadt.'
    ))

    s.append(step_block(
        4, "Zeg: nieuw project setup",
        "Claude leest CLAUDE.md en stelt eerst &#233;&#233;n vraag: lijkt dit op De Hofman "
        "(vastgoed-koop, units met m&#178;, persona belegger of eigen-gebruiker), "
        "of is het iets anders zoals woningen, garageboxen of kavels?"
    ))

    s.append(step_block(
        5, "Volg het juiste pad",
        [
            "<b>Pad A</b> (lijkt op De Hofman): negen stappen content invullen, 30 tot 45 minuten.",
            "<b>Pad B</b> (afwijkend type): Claude ontwerpt eerst samen met jou de nieuwe vragen, "
            "aanbeveling-logica en koop-signalen voor jouw archetype, daarna content-fill. "
            "Tijd: 1,5 tot 2 uur.",
        ]
    ))

    s.append(step_block(
        6, "Plaats je assets",
        'In <font face="Courier">public/brochure.pdf</font> en '
        '<font face="Courier">public/images/</font>: hero-foto, exterieur, '
        "sfeerbeelden en &#233;&#233;n foto per unit-type."
    ))

    s.append(step_block(
        7, "Test lokaal",
        'Run <font face="Courier">npm run check-content</font> (moet groen). Daarna '
        '<font face="Courier">npm run dev</font> en doorloop zelf de chat-flow op je telefoon: '
        "klopt de bot-intro, persona-copy, hot-moment en het prefilled WhatsApp-bericht?"
    ))

    s.append(step_block(
        8, "Deploy naar Vercel",
        'Commit en <font face="Courier">git push</font>. In Vercel: New Project, importeer de '
        "repo, deploy. Vercel detecteert Vite vanzelf, geen config nodig."
    ))

    # Pagina 2
    s.append(PageBreak())

    s.append(Paragraph("CONVERSATIONAL LANDING PAGE - ONBOARDING", styles["eyebrow"]))
    s.append(Paragraph("Onderhoud, troubleshooting en niet-doen", styles["h1"]))
    s.append(gold_line())

    s.append(KeepTogether([
        Paragraph("Als iets misgaat", styles["h2"]),
        two_col_table([
            ("check-content faalt",
             "Lees de error: er ontbreekt een veld in "
             '<font face="Courier">src/data/project.js</font> '
             'of een asset in <font face="Courier">public/images/</font>. Vul aan en run opnieuw.'),
            ("Bot zegt verkeerde naam",
             'Check <font face="Courier">project.salesTeam.bot.name</font> en '
             '<font face="Courier">project.salesTeam.rep.name</font>.'),
            ("WhatsApp-bericht klopt niet",
             'Check <font face="Courier">project.personaCopy.{persona}.waPhrase</font>; '
             "daar zit de eerste-persoons zin in het prefilled bericht."),
            ("Build faalt",
             'Lees <font face="Courier">npm run build</font> log of vraag het aan Claude Code. '
             "Vaak een ontbrekend asset of typo in project.js."),
            ("Service-card komt niet",
             "Buying-signal score haalt de hot-drempel niet (50). Check via "
             '<font face="Courier">?debug=1</font> URL en pas eventueel signal-gewichten aan.'),
        ]),
    ]))

    s.append(KeepTogether([
        Paragraph("Tijdsindicatie", styles["h2"]),
        two_col_table([
            ("Pad A (lijkt op De Hofman)",
             "Met alle content vooraf klaar: 30 tot 45 minuten van clone tot deploy."),
            ("Pad B (afwijkend type)",
             "Eerste keer 1,5 tot 2 uur. Claude ontwerpt nieuwe vragen-flow, aanbeveling-logica en koop-signalen."),
        ]),
    ]))

    s.append(KeepTogether([
        Paragraph("Wat je niet hoeft te doen", styles["h2"]),
        two_col_table([
            ("Componenten aanpassen",
             'Alle bubbles in <font face="Courier">src/components/</font> zijn project-agnostisch.'),
            ("Brand-tokens raken",
             'REPP-stijl in <font face="Courier">src/index.css</font> blijft hetzelfde, '
             "tenzij een klant eigen branding wil."),
            ("Tests draaien",
             'Er is geen test-suite. <font face="Courier">npm run check-content</font> en '
             '<font face="Courier">npm run check-copy</font> zijn de enige checks.'),
            ("State-machine raken",
             'De <font face="Courier">useReducer</font> in App.jsx is generiek. '
             "Aanpassen alleen bij Pad B als de flow zelf verandert."),
        ]),
    ]))

    s.append(KeepTogether([
        Paragraph("Ondersteuning", styles["h2"]),
        two_col_table([
            ("SETUP.md",
             "Volledig handmatig pad als je geen Claude Code wilt gebruiken."),
            ("CLAUDE.md",
             "Wizard-instructies voor Pad A en Pad B, plus alle conventies en valkuilen."),
            ("/architectuur.html",
             "Live overzicht van de chat-flow plus alle bubble-types."),
            ("/privacy.html",
             "Voorbeeld-privacystatement; aanpassen aan jouw project bij setup."),
        ]),
    ]))

    s.append(Spacer(1, 10))
    s.append(gold_line())
    s.append(Paragraph(
        "Vragen of haperingen tijdens setup? Spreek Jann aan of mail jann@repp.nl.",
        styles["foot"],
    ))

    doc.build(s, onFirstPage=header_footer, onLaterPages=header_footer)
    print(f"PDF generated: {OUT}")


if __name__ == "__main__":
    build()
