// Integritäts-Check für Prüfungstexte.
//
// Reines TypeScript ohne Browser- oder Node-Abhängigkeiten: Dieselbe Datei
// läuft heute im Browser und später unverändert auf dem Uni-Server.
//
// Das Ergebnis sind INDIZIEN für eine menschliche Prüfung, kein Beweis.
// Kein Wert hier ist eine "KI-Wahrscheinlichkeit".

import { normalisiere, zurueck, findeBase64, dekodiereNullbreiteBinaer, rot13 } from "./normalisieren.ts";

export type Kategorie =
  | "wasserzeichen"
  | "markup"
  | "chatreste"
  | "paste"
  | "stil"
  | "injection"
  | "dokument";

export type Schwere = "info" | "mittel" | "hoch";

export type Stelle = { start: number; ende: number };

export type Fund = {
  id: string;
  kategorie: Kategorie;
  schwere: Schwere;
  titel: string;
  detail: string;
  stellen: Stelle[];
  /** Beispiele aus dem Text, gekürzt — fürs Anzeigen ohne Markierung */
  belege?: string[];
};

export type Ampel = "gruen" | "gelb" | "rot";

export type Ergebnis = {
  ampel: Ampel;
  punkte: number;
  funde: Fund[];
  statistik: {
    zeichen: number;
    woerter: number;
    saetze: number;
    absaetze: number;
  };
};

/**
 * "online": Text stammt aus einem Web-Formular (z. B. Moodle). Dort entstehen
 *   beim Tippen nur gerade Anführungszeichen und Bindestriche — typografische
 *   Zeichen sind ein Hinweis auf eingefügten Text.
 * "word": Text stammt aus einem Textprogramm, das selbst typografisch ersetzt.
 *   Dann zählt nur die MISCHUNG der Stile.
 */
export type Modus = "online" | "word";

export const KATEGORIE_INFO: Record<Kategorie, { titel: string; kurz: string }> = {
  wasserzeichen: { titel: "Unsichtbare Zeichen & Wasserzeichen", kurz: "Wasserzeichen" },
  markup: { titel: "HTML-, Markdown- & Zitier-Reste", kurz: "Markup" },
  chatreste: { titel: "Chat-Reste & KI-Floskeln", kurz: "Chat-Reste" },
  paste: { titel: "Copy-Paste-Spuren (Word, PDF, Web)", kurz: "Copy-Paste" },
  stil: { titel: "KI-Handschrift (Stilmerkmale)", kurz: "KI-Stil" },
  injection: { titel: "Prompt-Injection", kurz: "Injection" },
  dokument: { titel: "Dokument-Metadaten & Formatierung", kurz: "Dokument" },
};

// ───────────────────────── Hilfsfunktionen ─────────────────────────

function alle(text: string, re: RegExp): Stelle[] {
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  const r = new RegExp(re.source, flags);
  const out: Stelle[] = [];
  let m: RegExpExecArray | null;
  while ((m = r.exec(text)) !== null) {
    if (m[0].length === 0) {
      r.lastIndex++;
      continue;
    }
    out.push({ start: m.index, ende: m.index + m[0].length });
  }
  return out;
}

function ausschnitt(text: string, s: Stelle, rand = 25): string {
  if (s.ende - s.start > 140) {
    const kurz = (t: string) => sichtbar(t).replace(/\s+/g, " ").trim();
    return `${kurz(text.slice(s.start, s.start + 70))} […] ${kurz(text.slice(s.ende - 50, s.ende))}`;
  }
  const a = Math.max(0, s.start - rand);
  const b = Math.min(text.length, s.ende + rand);
  return (a > 0 ? "…" : "") + sichtbar(text.slice(a, b)).replace(/\s+/g, " ").trim() + (b < text.length ? "…" : "");
}

/** Ersetzt unsichtbare Zeichen durch lesbare Kürzel, z. B. für Belege. */
export function sichtbar(t: string): string {
  return Array.from(t)
    .map((c) => {
      const n = ZEICHEN_NAMEN[c];
      return n ? `⟨${n}⟩` : c;
    })
    .join("");
}

export const ZEICHEN_NAMEN: Record<string, string> = {
  "​": "ZWSP",
  "‌": "ZWNJ",
  "‍": "ZWJ",
  "⁠": "WJ",
  "﻿": "BOM",
  "­": "SHY",
  " ": "NNBSP",
  " ": "NBSP",
  " ": "ENQ",
  " ": "EMQ",
  " ": "ENSP",
  " ": "EMSP",
  " ": "3MSP",
  " ": "4MSP",
  " ": "6MSP",
  " ": "FSP",
  " ": "PSP",
  " ": "THSP",
  " ": "HSP",
  " ": "MMSP",
  "　": "IDSP",
  "‎": "LRM",
  "‏": "RLM",
  "‪": "LRE",
  "‫": "RLE",
  "‬": "PDF",
  "‭": "LRO",
  "‮": "RLO",
  "⁦": "LRI",
  "⁧": "RLI",
  "⁨": "FSI",
  "⁩": "PDI",
  "\f": "FF",
};

function zaehleWoerter(t: string): number {
  return (t.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu) ?? []).length;
}

const ABKUERZUNGEN = [
  "Abs", "bzw", "vgl", "Nr", "lit", "Art", "Rz", "Rn", "ca", "etc", "insb", "ua", "usw", "zB", "idR", "iSd", "iVm",
  "Prof", "Dr", "Mag", "S", "Z", "f", "ff", "Bd", "Aufl", "Hrsg", "ggf", "va", "uU", "sog", "inkl", "bspw", "Ua",
];

function saetze(t: string): string[] {
  let x = t.replace(/\b(z|d|u|o|s)\.\s?([a-zA-Z])\./g, "$1§$2§");
  const re = new RegExp(`\\b(${ABKUERZUNGEN.join("|")})\\.`, "g");
  x = x.replace(re, "$1§");
  x = x.replace(/(\d)\.(\s?\d)/g, "$1§$2");
  return x
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => zaehleWoerter(s) >= 3);
}

// ───────────────────────── Prüfungen ─────────────────────────

type Pruefung = (text: string, modus: Modus) => Fund[];

const pruefeUnsichtbar: Pruefung = (text, modus) => {
  const funde: Fund[] = [];

  // Nullbreiten-Zeichen (BOM ganz am Anfang ist harmlos)
  const zw = alle(text, /[​‌‍⁠﻿]/).filter((s) => !(s.start === 0 && text[0] === "﻿"));
  if (zw.length) {
    funde.push({
      id: "nullbreite",
      kategorie: "wasserzeichen",
      schwere: "hoch",
      titel: `${zw.length} unsichtbare Nullbreiten-Zeichen`,
      detail:
        "Zeichen ohne Breite (z. B. ZWSP, ZWJ) entstehen beim Tippen nicht. Sie werden als Wasserzeichen in KI-Ausgaben, Webseiten und Kopierschutz-Texten verwendet oder kommen über Copy-Paste mit.",
      stellen: zw,
    });
  }

  // Unicode-Tag-Zeichen: unsichtbarer ASCII-Text ("ASCII smuggling")
  const tagRe = /(?:\uDB40[\uDC00-\uDC7F])+/g;
  const tags = alle(text, tagRe);
  if (tags.length) {
    const botschaften = tags.map((s) => {
      const roh = text.slice(s.start, s.ende);
      let out = "";
      for (const ch of roh) {
        const cp = ch.codePointAt(0)!;
        if (cp >= 0xe0020 && cp <= 0xe007e) out += String.fromCharCode(cp - 0xe0000);
      }
      return out;
    });
    funde.push({
      id: "tags",
      kategorie: "wasserzeichen",
      schwere: "hoch",
      titel: "Versteckter Text in Unicode-Tag-Zeichen",
      detail:
        "Der Text enthält unsichtbare Unicode-Tag-Zeichen, die eine eigene Botschaft kodieren. Das ist eine bekannte Technik für Wasserzeichen und versteckte Anweisungen an KI-Systeme.",
      stellen: tags,
      belege: botschaften.filter(Boolean).map((b) => `Versteckt: „${b}“`),
    });
  }

  // Variation Selectors außerhalb von Emoji
  const vs = alle(text, /(?:[︀-️]|\uDB40[\uDD00-\uDDEF])/).filter((s) => {
    const vor = text.codePointAt(Math.max(0, s.start - 2)) ?? 0;
    const vor1 = text.charCodeAt(s.start - 1);
    const istEmoji = vor > 0x2100 || (vor1 >= 0x2100 && vor1 <= 0x2bff);
    return !istEmoji;
  });
  if (vs.length) {
    funde.push({
      id: "variation",
      kategorie: "wasserzeichen",
      schwere: "hoch",
      titel: `${vs.length} Variation-Selector-Zeichen`,
      detail: "Unsichtbare Varianten-Selektoren an normalen Buchstaben. Sie können Daten im Text verstecken und entstehen beim Tippen nicht.",
      stellen: vs,
    });
  }

  // Richtungs-Steuerzeichen
  const bidi = alle(text, /[‎‏‪-‮⁦-⁩]/);
  if (bidi.length) {
    funde.push({
      id: "bidi",
      kategorie: "wasserzeichen",
      schwere: "hoch",
      titel: `${bidi.length} Schreibrichtungs-Steuerzeichen`,
      detail: "Steuerzeichen für die Schreibrichtung (z. B. RLO). In deutschsprachigen Texten ohne Funktion — oft Kopier-Artefakt oder Manipulation der Anzeige.",
      stellen: bidi,
    });
  }

  // Schmales geschütztes Leerzeichen — u. a. von KI-Modellen eingefügt
  const nnbsp = alle(text, / /);
  if (nnbsp.length) {
    funde.push({
      id: "nnbsp",
      kategorie: "wasserzeichen",
      schwere: "info",
      titel: `${nnbsp.length}× schmales geschütztes Leerzeichen (U+202F)`,
      detail:
        "Sieht aus wie ein normales Leerzeichen, lässt sich aber über die Tastatur praktisch nicht eingeben. Es taucht u. a. in Ausgaben einiger KI-Modelle auf (z. B. in „z. B.“). Weil es auch in sorgfältig gesetzten Texten vorkommt, nur ein Hinweis.",
      stellen: nnbsp,
    });
  }

  // Unicode-Bindestriche — u. a. in Ausgaben aktueller GPT-Modelle ("KI‑Modell")
  const binde = alle(text, /[\u2010\u2011]/);
  if (binde.length) {
    funde.push({
      id: "unicode-bindestrich",
      kategorie: "wasserzeichen",
      schwere: modus === "online" ? "mittel" : "info",
      titel: `${binde.length}× Unicode-Bindestrich (U+2011/U+2010)`,
      detail:
        "Sieht aus wie ein normaler Bindestrich, ist aber ein Sonderzeichen, das sich über die Tastatur nicht eingeben lässt. Es taucht u. a. in Ausgaben aktueller ChatGPT-Modelle auf (z. B. „KI‑Modell“, „E‑Mail“).",
      stellen: binde,
      belege: binde.slice(0, 3).map((s) => ausschnitt(text, s, 12)),
    });
  }

  // Sonstige Spezial-Leerzeichen
  const spaces = alle(text, /[ -  　]/);
  if (spaces.length) {
    funde.push({
      id: "spaces",
      kategorie: "wasserzeichen",
      schwere: "mittel",
      titel: `${spaces.length} typografische Sonder-Leerzeichen`,
      detail: "Leerzeichen aus dem Unicode-Bereich U+2000–U+200A. Über die Tastatur nicht erzeugbar, typisch für Satzprogramme, Webseiten und KI-Ausgaben.",
      stellen: spaces,
    });
  }

  // Steuerzeichen
  const ctrl = alle(text, /[\u0000-\u0008\u000B\u000E-\u001F\u007F]/);
  if (ctrl.length) {
    funde.push({
      id: "ctrl",
      kategorie: "wasserzeichen",
      schwere: "mittel",
      titel: `${ctrl.length} Steuerzeichen`,
      detail: "Nicht druckbare Steuerzeichen — entstehen bei Kopien aus PDFs oder Programmen, nicht beim Tippen.",
      stellen: ctrl,
    });
  }

  // Homoglyphen: kyrillische/griechische Buchstaben in lateinischen Wörtern
  const homo: Stelle[] = [];
  const wortRe = /[\p{L}]+/gu;
  let m: RegExpExecArray | null;
  while ((m = wortRe.exec(text)) !== null) {
    const w = m[0];
    if (/\p{Script=Latin}/u.test(w) && /[\p{Script=Cyrillic}\p{Script=Greek}]/u.test(w)) {
      homo.push({ start: m.index, ende: m.index + w.length });
    }
  }
  if (homo.length) {
    funde.push({
      id: "homoglyph",
      kategorie: "wasserzeichen",
      schwere: "hoch",
      titel: `${homo.length} Wörter mit vertauschten Buchstaben (Homoglyphen)`,
      detail:
        "Wörter mischen lateinische mit kyrillischen oder griechischen Buchstaben, die gleich aussehen (z. B. „а“ statt „a“). Das ist eine Technik, um Plagiats- und KI-Erkennung zu umgehen.",
      stellen: homo,
      belege: homo.slice(0, 5).map((s) => text.slice(s.start, s.ende)),
    });
  }

  return funde;
};

const pruefeMarkup: Pruefung = (text) => {
  const funde: Fund[] = [];

  const ki = alle(
    text,
    /【[^】]{0,80}】|\bturn\d+(?:search|news|view|file|image)\d+\b|:?contentReference\[oaicite:\d+\](?:\{[^}]*\})?|\boaicite\b|\bciteturn\w*|utm_source=(?:chatgpt\.com|openai|perplexity|copilot\.com|claude\.ai)\b|\[\^\d+\^\]/i,
  );
  if (ki.length) {
    funde.push({
      id: "ki-zitate",
      kategorie: "markup",
      schwere: "hoch",
      titel: "Zitier-Marker aus KI-Chats",
      detail:
        "Interne Quellenmarker oder Links mit Herkunfts-Kennung (z. B. „utm_source=chatgpt.com“, „【4†source】“, „oaicite“). Sie entstehen nur beim Kopieren aus KI-Oberflächen.",
      stellen: ki,
      belege: ki.slice(0, 4).map((s) => text.slice(s.start, s.ende)),
    });
  }

  const html = alle(text, /<\/?(?:p|div|span|br|strong|em|b|i|u|ul|ol|li|h[1-6]|table|thead|tbody|tr|td|th|a|mark|sup|sub|code|pre|blockquote|hr|font|style|script)\b[^>]*>/i);
  if (html.length) {
    funde.push({
      id: "html",
      kategorie: "markup",
      schwere: "hoch",
      titel: `${html.length} HTML-Tags im Text`,
      detail: "HTML-Fragmente entstehen nicht beim Tippen, sondern beim Kopieren aus Webseiten, Chat-Oberflächen oder Editoren.",
      stellen: html,
      belege: [...new Set(html.map((s) => text.slice(s.start, s.ende)))].slice(0, 6),
    });
  }

  const ent = alle(text, /&(?:nbsp|amp|lt|gt|quot|apos|shy|ndash|mdash|hellip|#\d{2,6}|#x[0-9a-f]{2,6});/i);
  if (ent.length) {
    funde.push({
      id: "entities",
      kategorie: "markup",
      schwere: "mittel",
      titel: `${ent.length} HTML-Entities`,
      detail: "Kodierte Sonderzeichen wie „&nbsp;“ — Reste aus HTML-Quelltext.",
      stellen: ent,
    });
  }

  const md: Stelle[] = [
    ...alle(text, /\*\*[^*\n]{1,120}\*\*|__[^_\n]{1,120}__/),
    ...alle(text, /^#{1,6} \S.*$/m),
    ...alle(text, /^```[\s\S]*?^```/m),
    ...alle(text, /\[[^\]\n]{1,100}\]\((?:https?:\/\/|www\.)[^)\s]+\)/),
    ...alle(text, /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/m),
  ];
  if (md.length) {
    funde.push({
      id: "markdown",
      kategorie: "markup",
      schwere: "hoch",
      titel: `${md.length} Markdown-Formatierungen`,
      detail:
        "Sternchen-Fettdruck (**…**), Rauten-Überschriften (## …), Code-Blöcke oder Markdown-Tabellen. Das ist das Ausgabeformat von KI-Chats — beim Kopieren als Klartext bleiben diese Zeichen stehen.",
      stellen: md,
      belege: md.slice(0, 4).map((s) => ausschnitt(text, s, 0)),
    });
  }

  const latex = alle(text, /\\\(|\\\)|\\\[|\\\]|\\(?:frac|cdot|text|mathrm|sum|times)\b/);
  if (latex.length) {
    funde.push({
      id: "latex",
      kategorie: "markup",
      schwere: "mittel",
      titel: `${latex.length} LaTeX-Fragmente`,
      detail: "Formel-Markup wie „\\(“ oder „\\frac“ — typisch für KI-Ausgaben mit Formeln.",
      stellen: latex,
    });
  }

  return funde;
};

const CHAT_HOCH: [RegExp, string][] = [
  [/\bals (?:eine? )?KI(?:-Sprachmodell| Sprachmodell|-Modell|-Assistent)?\b/i, "Selbstbezeichnung als KI"],
  [/\bas an AI(?: language model)?\b/i, "Selbstbezeichnung als KI (englisch)"],
  [/\bich bin (?:eine? )?(?:KI|künstliche Intelligenz|Sprachmodell)\b/i, "Selbstbezeichnung als KI"],
  [/\bGerne[!,.]? (?:helfe|erkläre|fasse|erstelle|gebe|zeige|beantworte) ich\b/i, "Chat-Einleitung"],
  [/\bHier (?:ist|sind|findest du|finden Sie) (?:eine?n?|die|der|das|einige|mögliche)\b[^.\n]{0,60}(?:Antwort|Lösung|Zusammenfassung|Gliederung|Fassung|Version|Falllösung|Prüfung|Überblick|Text)/i, "Chat-Einleitung"],
  [/\bIch hoffe,? (?:das|dies|diese \w+) (?:hilft|hat geholfen|war hilfreich)/i, "Chat-Schlussformel"],
  [/\b(?:Möchtest du|Möchten Sie|Soll ich|Sollen wir),? (?:dass ich|noch|auch|eine|weitere|das)\b[^?\n]{0,80}\?/i, "Rückfrage an den Nutzer"],
  [/\b(?:Lass|Lassen Sie) (?:mich|es mich) wissen\b/i, "Chat-Schlussformel"],
  [/\b(?:Wenn|Falls) (?:du|Sie) (?:willst|möchtest|möchten|magst|magst du|es brauchst|das brauchst),? (?:kann|könnte|mache|schreibe|erstelle|formuliere) ich\b/i, "Chat-Angebot („Wenn du willst, kann ich …“)"],
  [/\b(?:Sag|Sagen Sie) (?:mir )?(?:einfach )?Bescheid\b|\bIch kann (?:dir|Ihnen) (?:auch|gerne|gern)\b/i, "Chat-Angebot"],
  [/\b(?:Let me know|I hope this helps|Certainly!|Sure! Here|Here is a|Here's a)\b/i, "englische Chat-Formel"],
  [/\b(?:Stand meines Wissens|meines Wissensstand|knowledge cutoff|Trainingsdaten)\b/i, "Verweis auf Trainingsstand"],
  [/\b(?:keine|ersetzt keine) (?:individuelle )?Rechtsberatung\b|\bich bin kein(?:e)? (?:Rechts)?(?:anwalt|Anwältin|Jurist)/i, "Haftungs-Hinweis eines Chatbots"],
  [/\b(?:ChatGPT|GPT-[345]|Claude|Gemini|Copilot|Perplexity|DeepSeek|Mistral|Le Chat|Grok|Llama)\b/, "Name eines KI-Systems im Text"],
  [/\b(?:ChatGPT|Claude|Gemini|Copilot|KI|AI) (?:kann|can) (?:Fehler machen|make mistakes)\b|\bÜberprüfe wichtige Informationen\b|\bCheck important info\b/i, "Fußzeile einer Chat-Oberfläche"],
  [/^\s*(?:Du hast gesagt|You said|ChatGPT (?:hat gesagt|said)|Claude (?:hat gesagt|said)|Antwort von \w+)\s*:?\s*$/im, "Dialog-Beschriftung aus dem Chat"],
  [/\b(?:Nachgedacht|Thought|Reasoned|Überlegt) (?:für|for|über) (?:ein paar |einige |\d+ )?(?:Sekunden?|seconds?|s|Minuten?|minutes?)\b/i, "Denkzeit-Anzeige eines Reasoning-Modells"],
  [/^\s*(?:Code kopieren|Copy code|Kopieren|Copy|Bearbeiten|Edit|Teilen|Share|Neu generieren|Regenerate|Quellen|Sources|Suche im Web|Searched the web|Searching the web)\s*$/im, "Schaltflächen-Text einer Chat-Oberfläche"],
  [/\b(?:Erstellt|Generiert|Verfasst|Generated|Written|Created) (?:mit|von|by|with) (?:Hilfe von |help of )?(?:ChatGPT|Claude|Gemini|Copilot|KI|AI)\b/i, "KI-Hinweis im Text"],
];

const FLOSKELN: RegExp[] = [
  /\bZusammenfassend (?:lässt sich|kann man) (?:sagen|festhalten|feststellen)\b/i,
  /\bEs ist (?:jedoch |dabei )?(?:wichtig|zu beachten|entscheidend|hervorzuheben),? (?:zu beachten|dass)\b/i,
  /\bspielt (?:\p{L}+ )?eine (?:entscheidende|zentrale|wichtige|wesentliche|maßgebliche) Rolle\b/iu,
  /\b(?:nuanciert|vielschichtig|facettenreich|ganzheitlich)\w*\b/i,
  /\bInsgesamt (?:lässt sich|zeigt sich|ist festzuhalten)\b/i,
  /\bIm Folgenden (?:werde ich|wird|werden)\b/i,
  /\b(?:Kurz gesagt|Kurzum|Im Kern)\b/i,
  /\bLass(?:t)? uns\b/i,
  /\bDies unterstreicht\b|\bDas unterstreicht\b/i,
  /\bein(?:e)? (?:komplexe|spannende|interessante) (?:Frage|Thematik|Fragestellung)\b/i,
  /\bim Hinblick auf\b/i,
  /^\s*(?:Fazit|Ergebnis|Zusammenfassung)\s*:/im,
];

const pruefeChatreste: Pruefung = (text) => {
  const funde: Fund[] = [];
  const hoch: Stelle[] = [];
  const arten = new Set<string>();
  for (const [re, art] of CHAT_HOCH) {
    const s = alle(text, re);
    if (s.length) {
      hoch.push(...s);
      arten.add(art);
    }
  }
  if (hoch.length) {
    funde.push({
      id: "chatformeln",
      kategorie: "chatreste",
      schwere: "hoch",
      titel: `${hoch.length} Chat-Formel${hoch.length > 1 ? "n" : ""} im Text`,
      detail: `Formulierungen, die aus einem Dialog mit einem KI-Assistenten stammen (${[...arten].join(", ")}). In einer Prüfungsantwort ergeben sie keinen Sinn.`,
      stellen: hoch,
      belege: hoch.slice(0, 4).map((s) => ausschnitt(text, s, 15)),
    });
  }

  const floskeln: Stelle[] = [];
  let verschieden = 0;
  for (const re of FLOSKELN) {
    const s = alle(text, re);
    if (s.length) {
      floskeln.push(...s);
      verschieden++;
    }
  }
  if (verschieden >= 2) {
    funde.push({
      id: "floskeln",
      kategorie: "chatreste",
      schwere: verschieden >= 4 ? "mittel" : "info",
      titel: `${floskeln.length} typische KI-Floskeln`,
      detail:
        "Wendungen, die in KI-Texten überdurchschnittlich häufig sind („Es ist wichtig zu beachten …“, „spielt eine entscheidende Rolle“). Einzeln harmlos — erst die Häufung ist ein Indiz.",
      stellen: floskeln,
      belege: floskeln.slice(0, 4).map((s) => text.slice(s.start, s.ende)),
    });
  }
  return funde;
};

const pruefePaste: Pruefung = (text, modus) => {
  const funde: Fund[] = [];

  // PDF: Ligaturen und Private-Use-Zeichen
  const lig = alle(text, /[ﬀ-ﬆ]/);
  if (lig.length) {
    funde.push({
      id: "ligaturen",
      kategorie: "paste",
      schwere: "hoch",
      titel: `${lig.length} Ligatur-Zeichen (ﬁ, ﬂ, ﬀ …)`,
      detail: "„ﬁ“ oder „ﬂ“ als ein einziges Zeichen entstehen nicht beim Tippen. Sie sind ein klassisches Merkmal von Text, der aus einem PDF kopiert wurde.",
      stellen: lig,
      belege: lig.slice(0, 4).map((s) => ausschnitt(text, s, 10)),
    });
  }
  const pua = alle(text, /[-]/);
  if (pua.length) {
    funde.push({
      id: "pua",
      kategorie: "paste",
      schwere: "hoch",
      titel: `${pua.length} Zeichen aus dem privaten Unicode-Bereich`,
      detail: "Diese Zeichen stammen aus eingebetteten PDF- oder Symbolschriften und kommen nur über Copy-Paste in einen Text.",
      stellen: pua,
    });
  }

  // PDF: Silbentrennung am Zeilenende
  const trenn = alle(text, /[a-zäöüß]-\n[a-zäöüß]/);
  if (trenn.length) {
    funde.push({
      id: "silbentrennung",
      kategorie: "paste",
      schwere: "mittel",
      titel: `${trenn.length} getrennte Wörter am Zeilenende`,
      detail: "Wörter wie „Ver-↵schulden“ entstehen beim Kopieren aus PDFs oder gesetzten Texten mit Silbentrennung.",
      stellen: trenn,
      belege: trenn.slice(0, 4).map((s) => ausschnitt(text, s, 10)),
    });
  }

  // PDF: harte Zeilenumbrüche mitten im Satz
  const zeilen = text.split("\n");
  const harte: Stelle[] = [];
  let pos = 0;
  for (let i = 0; i < zeilen.length - 1; i++) {
    const z = zeilen[i];
    const naechste = zeilen[i + 1];
    const len = z.trim().length;
    if (len >= 35 && len <= 120 && !/[.!?:;)"“”]\s*$/.test(z) && /^\s*[a-zäöüß(]/.test(naechste)) {
      harte.push({ start: pos + z.length, ende: pos + z.length + 1 });
    }
    pos += z.length + 1;
  }
  if (harte.length >= 3) {
    funde.push({
      id: "umbrueche",
      kategorie: "paste",
      schwere: "mittel",
      titel: `${harte.length} Zeilenumbrüche mitten im Satz`,
      detail: "Der Text bricht in regelmäßigen Abständen mitten im Satz um. Das ist typisch für Kopien aus PDFs, bei denen jede Druckzeile als eigene Zeile übernommen wird.",
      stellen: harte,
    });
  }

  // Aufzählungszeichen aus Word/PDF
  const bullets = alle(text, /^[ \t]*[•▪●◦■□➢➤►–][ \t]/m);
  if (bullets.length) {
    funde.push({
      id: "bullets",
      kategorie: "paste",
      schwere: "mittel",
      titel: `${bullets.length} kopierte Aufzählungszeichen`,
      detail: "Aufzählungspunkte wie „•“ oder „▪“ als echte Zeichen — so landen Listen aus Word, PDF oder Webseiten im Klartext.",
      stellen: bullets,
    });
  }

  // Geschützte Leerzeichen (U+00A0) sind KEIN Indiz: In juristischen Texten
  // stehen sie regelmäßig, etwa in „§ 1295“ oder „Abs 1“ (Hinweis REWI).


  // Typografie: im Web-Formular tippt niemand „…“ — in Word zählt die Mischung
  const typo = {
    anf: alle(text, /[„“”‚‘»«›‹]/),
    gerade: alle(text, /"/),
    apostTyp: alle(text, /(?<=\p{L})’(?=\p{L})/u),
    apostGerade: alle(text, /(?<=\p{L})'(?=\p{L})/u),
    halbgeviert: alle(text, / – /),
    bindestrichAlsStrich: alle(text, / - /),
    ellipse: alle(text, /…/),
    punkte: alle(text, /\.\.\./),
  };

  if (modus === "online") {
    const bisStrich = alle(text, /\d–\d|\p{L}–\p{L}/u);
    const sonder = alle(text, /[×≈≤≥±·]/);
    const typStellen = [...typo.anf, ...typo.apostTyp, ...typo.halbgeviert, ...typo.ellipse, ...bisStrich, ...sonder];
    if (typStellen.length >= 2) {
      funde.push({
        id: "typografie-online",
        kategorie: "paste",
        schwere: "mittel",
        titel: `${typStellen.length} typografische Zeichen in Formular-Eingabe`,
        detail:
          "In einem Web-Formular wie Moodle entstehen beim Tippen nur gerade Anführungszeichen (\") und Bindestriche (-). „Gänsefüßchen“, Halbgeviertstriche (– und „12–15“), Malzeichen (×) oder das Auslassungszeichen (…) kommen aus Word, PDFs oder KI-Texten. Ausnahme: Smartphones und manche Mac-Einstellungen ersetzen automatisch.",
        stellen: typStellen,
      });
    }
  }

  const mischungen: { name: string; a: Stelle[]; b: Stelle[]; aName: string; bName: string }[] = [
    { name: "Anführungszeichen", a: typo.anf, b: typo.gerade, aName: "„typografisch“", bName: "\"gerade\"" },
    { name: "Apostrophe", a: typo.apostTyp, b: typo.apostGerade, aName: "’", bName: "'" },
    { name: "Gedankenstriche", a: typo.halbgeviert, b: typo.bindestrichAlsStrich, aName: "„ – “", bName: "„ - “" },
    { name: "Auslassungspunkte", a: typo.ellipse, b: typo.punkte, aName: "„…“", bName: "„...“" },
  ];
  const misch: Stelle[] = [];
  const welche: string[] = [];
  for (const m of mischungen) {
    if (m.a.length && m.b.length) {
      // Die seltenere Variante markieren — sie ist vermutlich der Fremdkörper
      misch.push(...(m.a.length <= m.b.length ? m.a : m.b));
      welche.push(`${m.name} (${m.a.length}× ${m.aName}, ${m.b.length}× ${m.bName})`);
    }
  }
  if (welche.length) {
    funde.push({
      id: "stilmix",
      kategorie: "paste",
      schwere: "mittel",
      titel: `Uneinheitliche Zeichensetzung: ${welche.length === 1 ? welche[0].split(" (")[0] : welche.length + " Arten"}`,
      detail: `Der Text mischt Schreibweisen, die ein Mensch beim durchgehenden Tippen einheitlich verwendet: ${welche.join("; ")}. Markiert ist jeweils die seltenere Variante — sie zeigt die Stellen, die vermutlich aus einer anderen Quelle eingefügt wurden.`,
      stellen: misch,
    });
  }

  return funde;
};

const pruefeStil: Pruefung = (text) => {
  const funde: Fund[] = [];
  const woerter = zaehleWoerter(text);

  // Geviertstrich — im Deutschen unüblich, in KI-Texten sehr häufig
  const geviert = alle(text, /—/);
  if (geviert.length) {
    const ohneLeer = alle(text, /\p{L}—\p{L}/u).length;
    funde.push({
      id: "geviertstrich",
      kategorie: "stil",
      schwere: geviert.length >= 3 || ohneLeer > 0 ? "mittel" : "info",
      titel: `${geviert.length}× Geviertstrich (—)`,
      detail:
        "Der lange Strich „—“ ist im Deutschen unüblich (üblich ist „ – “) und lässt sich weder in Word noch im Browser einfach tippen. KI-Modelle verwenden ihn auffallend oft, häufig ohne Leerzeichen.",
      stellen: geviert,
    });
  }

  // Emoji und Pfeil-Symbole
  const emoji = alle(text, /[\u{1F300}-\u{1FAFF}✅❌✔✖➡⬅⬆⬇⚠]|→|⇒/u);
  if (emoji.length) {
    funde.push({
      id: "emoji",
      kategorie: "stil",
      schwere: emoji.length >= 2 ? "mittel" : "info",
      titel: `${emoji.length} Emoji/Pfeil-Symbole`,
      detail: "Symbole wie ✅, 📌 oder → strukturieren Chat-Antworten, sind in handschriftlich formulierten Prüfungsantworten aber selten.",
      stellen: emoji,
    });
  }

  // Deutsches statt österreichisches Recht — typischer KI-Fehler
  const deRecht = alle(text, /§\s?\d+[a-z]?\s+(?:Abs\.?\s?\d+\s+)?(?:S\.?\s?\d+\s+)?BGB\b|\bBGB\b|\bBGH\b|\bBundesgerichtshof\b|\bGrundgesetz(?:es)?\b|\bArt\.?\s?\d+\s+GG\b|\bHGB\b(?=[^.]{0,40}Deutschland)/);
  if (deRecht.length) {
    funde.push({
      id: "deutsches-recht",
      kategorie: "stil",
      schwere: "mittel",
      titel: `${deRecht.length}× deutsches Recht zitiert (BGB, BGH, GG)`,
      detail:
        "Die Antwort verweist auf deutsche Normen oder Gerichte. Bei österreichischen Sachverhalten ist das ein typischer Fehler von KI-Modellen, die überwiegend mit deutschen Texten trainiert wurden.",
      stellen: deRecht,
      belege: deRecht.slice(0, 4).map((s) => text.slice(s.start, s.ende)),
    });
  }

  // Satzlängen-Gleichförmigkeit ("Burstiness")
  const s = saetze(text);
  if (s.length >= 10 && woerter >= 150) {
    const l = s.map(zaehleWoerter);
    const mittel = l.reduce((a, b) => a + b, 0) / l.length;
    const sd = Math.sqrt(l.reduce((a, b) => a + (b - mittel) ** 2, 0) / l.length);
    const cv = sd / mittel;
    if (cv < 0.3) {
      funde.push({
        id: "burstiness",
        kategorie: "stil",
        schwere: "info",
        titel: "Sehr gleichförmige Satzlängen",
        detail: `Die Sätze sind auffällig gleich lang (Ø ${mittel.toFixed(1)} Wörter, Streuung ${(cv * 100).toFixed(0)} %). Menschliche Texte wechseln meist stärker zwischen kurzen und langen Sätzen. Allein kein belastbares Indiz.`,
        stellen: [],
      });
    }
  }

  // Gliederung einer Chat-Antwort, die als Klartext eingefügt wurde
  const etiketten = alle(text, /^(?:\d+[.)]\s*)?[A-ZÄÖÜ][\p{L} -]{1,40}:\s+\S/mu);
  const listen = alle(text, /^[ \t]*(?:[-*]|\d+\))[ \t]+\S/m);
  if (etiketten.length >= 3 || listen.length >= 4) {
    funde.push({
      id: "chat-gliederung",
      kategorie: "stil",
      schwere: etiketten.length >= 3 && listen.length >= 2 ? "mittel" : "info",
      titel: "Gliederung im Stil einer Chat-Antwort",
      detail: `${etiketten.length} Absätze beginnen mit „Stichwort: …“, ${listen.length} Zeilen sind Spiegelstriche oder „1)“-Aufzählungen. So sehen Chat-Antworten aus, wenn ihr Fettdruck beim Kopieren verloren geht. In handschriftlich formulierten Falllösungen selten.`,
      stellen: [...etiketten, ...listen],
    });
  }

  // Übergangswörter am Satzanfang — KI-Texte verketten Sätze auffallend gleichförmig
  if (s.length >= 8) {
    const uebergang = s.filter((x) => /^(?:Zudem|Darüber hinaus|Außerdem|Ferner|Gleichzeitig|Letztlich|Insbesondere|Dabei|Somit|Folglich|Zusammenfassend|Insgesamt|Allerdings|Jedoch|Daher|Damit|Hierbei|Ebenso|Zugleich)\b/.test(x)).length;
    if (uebergang / s.length >= 0.4) {
      funde.push({
        id: "uebergaenge",
        kategorie: "stil",
        schwere: "info",
        titel: `${uebergang} von ${s.length} Sätzen beginnen mit Übergangswörtern`,
        detail: "„Zudem“, „Darüber hinaus“, „Somit“ … am Satzanfang in dieser Dichte ist typisch für KI-Texte. Allein kein Indiz.",
        stellen: [],
      });
    }
  }

  // Zwischenüberschriften in einer Prüfungsantwort
  const ueber = alle(text, /^(?:\d+\.\s)?[A-ZÄÖÜ][^\n.!?]{2,60}:?\s*$(?=\n[^\n])/m).filter((st) => {
    const z = text.slice(st.start, st.ende).trim();
    return zaehleWoerter(z) <= 7 && !/[,;]$/.test(z);
  });
  if (ueber.length >= 3) {
    funde.push({
      id: "ueberschriften",
      kategorie: "stil",
      schwere: "info",
      titel: `${ueber.length} Zwischenüberschriften`,
      detail: "Kurze Titelzeilen vor jedem Absatz — das typische Gliederungsmuster von KI-Antworten. Bei Gutachten-Stil aber auch üblich.",
      stellen: ueber,
    });
  }

  return funde;
};

// ───────── Prompt-Injection ─────────
// Mustergruppen, jeweils deutsch und englisch. Geprüft wird der Originaltext
// UND eine normalisierte Fassung (Homoglyphen, Leetspeak, gesperrte Schrift,
// unsichtbare Zeichen entfernt), dazu dekodierte Base64-, ROT13- und
// Nullbreiten-Inhalte.

const INJECTION_MUSTER: [string, RegExp][] = [
  ["Anweisungen außer Kraft setzen",
    /\b(?:ignor(?:e|iere|ieren|iert)|vergiss|vergessen sie|missachte|überschreibe|disregard|forget|override|bypass)\b[^.\n]{0,50}\b(?:Anweisung\w*|Instruktion\w*|Vorgabe\w*|Regel\w*|Kriteri\w*|Lösungsskizze|Bewertungsschema|Prompt\w*|instructions?|rules?|guidelines?|everything|alles)\b/i],
  ["Rollenwechsel / neue Systemanweisung",
    /\b(?:du bist (?:jetzt|nun|ab sofort|ab jetzt)|ab sofort bist du|you are now|from now on,? you|act as|agiere als|verhalte dich wie|pretend (?:to be|you are)|neue (?:System)?anweisung(?:en)?:|new instructions?:|developer mode|jailbreak|DAN\b)/i],
  ["Gefälschte System- oder Chat-Markierung",
    /<\|(?:im_start|im_end|system|endoftext|eot_id|start_header_id)\|>|\[\/?INST\]|<<\/?SYS>>|<\/?(?:system|instructions?|prompt|assistant|user)>|^\s*(?:#{2,}\s*)?(?:System|SYSTEM|Instruction|INSTRUCTION|Assistant|Human|User)\s*:|\[(?:SYSTEM|ADMIN|DEVELOPER)[^\]]{0,20}\]|^-{3,}\s*(?:END|ENDE)\b|<\/(?:answer|antwort|response|submission)>/im],
  ["Bewertung vorgeben",
    /\b(?:vergib|vergebe|vergeben sie|gib|geben sie|bewerte|bewerten sie|give|award|assign|grade|rate|score)\b[^.\n]{0,40}\b(?:volle[nr]?|maximale[nr]?|höchste[nr]?|alle|full|maximum|max|perfect|top)\b[^.\n]{0,20}\b(?:Punkte?|Punktzahl|Bewertung|Note|points?|marks?|score|grade)\b|\b(?:bewerte|beurteile|grade|rate|mark)\b[^.\n]{0,30}\b(?:als|as)\b[^.\n]{0,15}\b(?:korrekt|richtig|vollständig|ausgezeichnet|sehr gut|perfekt|correct|excellent|perfect)\b|\balle (?:Bewertungs)?kriterien (?:sind |wurden )?(?:vollständig )?erfüllt\b|\b(?:Punkte|Bewertung|Score|Note)\s*[:=]\s*(?:\d{1,3}\s*\/\s*\d{1,3}|100\s?%|1\b|sehr gut)/i],
  ["Bewertungs-JSON",
    /\{\s*"(?:punkte|score|points|grade|note|bewertung|erfuellt|passed)"\s*:/i],
  ["Direkte Ansprache der Korrektur-KI",
    /\b(?:an die|liebe|hallo|hey|hinweis für die|hinweis an die|nachricht an die|note to the|dear|attention)\s+(?:KI|K\.I\.|AI|LLM|Korrektur-KI|Bewertungs-KI|Sprachmodell|Modell|model|grader|Korrektor\w*|Bewerter\w*|Prüfer\w*|Assistent\w*|ChatGPT|Claude|Gemini)\b|\b(?:wenn|falls) (?:du|Sie) (?:eine?|ein) (?:KI|Sprachmodell|LLM|AI|künstliche Intelligenz)\b|\bif you are an? (?:AI|LLM|language model|assistant|grader)\b/i],
  ["Ausgabe steuern / verheimlichen",
    /\b(?:antworte|antworten sie|respond|reply|output)\b[^.\n]{0,20}\b(?:nur|ausschließlich|only|just)\b[^.\n]{0,20}\b(?:mit|with)\b|\b(?:erwähne|erwähnen sie|verrate|melde|mention|reveal|report|flag)\b[^.\n]{0,30}\b(?:nicht|nie|keinesfalls|not|never)\b|\b(?:do not|don't|nicht)\s+(?:mention|flag|report|erwähnen|melden|markieren)\b/i],
  ["Versteckter HTML-Kommentar",
    /<!--[\s\S]{0,500}?-->/],
];

type InjectionTreffer = { art: string; stelle: Stelle; klartext?: string; tarnung?: string };

function injectionSuche(t: string): { art: string; start: number; ende: number }[] {
  const out: { art: string; start: number; ende: number }[] = [];
  for (const [art, re] of INJECTION_MUSTER) {
    for (const s of alle(t, re)) out.push({ art, ...s });
  }
  return out;
}

function tarnungBeschreiben(roh: string): string {
  const arten: string[] = [];
  if (/[​-‏⁠-⁯﻿­]/.test(roh)) arten.push("unsichtbare Zeichen dazwischen");
  if (/[\p{Script=Cyrillic}\p{Script=Greek}]/u.test(roh)) arten.push("Homoglyphen");
  if (/[\u{1D400}-\u{1D7FF}！-～]/u.test(roh)) arten.push("Sonder-Alphabet");
  if (/\p{L}[013457@$]\p{L}|[013457@$]\p{L}{2}/u.test(roh)) arten.push("Leetspeak");
  if (/(?:\p{L}[ ._\-*·]{1,2}){3,}\p{L}/u.test(roh)) arten.push("gesperrte Buchstaben");
  if (/[\u{E0000}-\u{E007F}]/u.test(roh)) arten.push("Unicode-Tags");
  if (/\p{M}/u.test(roh.normalize("NFC"))) arten.push("kombinierende Zeichen");
  return arten.join(", ") || "verschleiert";
}

const pruefeInjection: Pruefung = (text) => {
  const treffer: InjectionTreffer[] = [];
  const belegt = (s: Stelle) => treffer.some((t) => t.stelle.start < s.ende && s.start < t.stelle.ende);

  // 1. Klartext
  for (const t of injectionSuche(text)) {
    if (!belegt(t)) treffer.push({ art: t.art, stelle: { start: t.start, ende: t.ende } });
  }

  // 2. Normalisierte Fassung → getarnte Anweisungen
  const n = normalisiere(text);
  if (n.text !== text) {
    for (const t of injectionSuche(n.text)) {
      const s = zurueck(n, t.start, t.ende, text);
      if (belegt(s)) continue;
      const roh = text.slice(s.start, s.ende);
      treffer.push({ art: t.art, stelle: s, klartext: n.text.slice(t.start, t.ende), tarnung: tarnungBeschreiben(roh) });
    }
  }

  // 3. Kodierte Inhalte
  for (const b of findeBase64(text)) {
    const inj = injectionSuche(normalisiere(b.klartext).text);
    treffer.push({ art: inj[0]?.art ?? "Kodierter Text", stelle: b, klartext: b.klartext, tarnung: inj.length ? "Base64-kodiert" : "Base64 (ohne erkennbare Anweisung)" });
  }
  for (const z of dekodiereNullbreiteBinaer(text)) {
    treffer.push({ art: injectionSuche(z.klartext)[0]?.art ?? "Versteckte Botschaft", stelle: z, klartext: z.klartext, tarnung: "Binärcode aus Nullbreiten-Zeichen" });
  }
  const r13 = rot13(text);
  for (const t of injectionSuche(r13)) {
    if (t.art === "Versteckter HTML-Kommentar" || belegt(t)) continue;
    // Nur werten, wenn der Originaltext an der Stelle kein Deutsch/Englisch ist
    if (injectionSuche(text.slice(t.start, t.ende)).length) continue;
    treffer.push({ art: t.art, stelle: { start: t.start, ende: t.ende }, klartext: r13.slice(t.start, t.ende), tarnung: "ROT13" });
  }

  const funde: Fund[] = [];
  const offen = treffer.filter((t) => !t.tarnung);
  const getarnt = treffer.filter((t) => t.tarnung && !t.tarnung.startsWith("Base64 (ohne"));
  const nurKodiert = treffer.filter((t) => t.tarnung?.startsWith("Base64 (ohne"));

  if (offen.length) {
    const arten = [...new Set(offen.map((t) => t.art))];
    funde.push({
      id: "injection",
      kategorie: "injection",
      schwere: "hoch",
      titel: `${offen.length} Anweisung${offen.length > 1 ? "en" : ""} an die Korrektur-KI`,
      detail: `Der Text enthält Formulierungen, die eine automatische Bewertung manipulieren sollen: ${arten.join(", ")}.`,
      stellen: offen.map((t) => t.stelle),
      belege: offen.slice(0, 4).map((t) => ausschnitt(text, t.stelle, 10)),
    });
  }
  if (getarnt.length) {
    const arten = [...new Set(getarnt.map((t) => t.tarnung!))];
    funde.push({
      id: "injection-getarnt",
      kategorie: "injection",
      schwere: "hoch",
      titel: `${getarnt.length} GETARNTE Anweisung${getarnt.length > 1 ? "en" : ""} an die Korrektur-KI`,
      detail: `Anweisungen, die gegen Filter verschleiert wurden (${arten.join("; ")}). Für Menschen unauffällig oder unlesbar — eine KI liest sie aber. Das ist ein deutlicher Manipulationsversuch.`,
      stellen: getarnt.map((t) => t.stelle),
      belege: getarnt.slice(0, 4).map((t) => `${t.tarnung}: „${(t.klartext ?? "").slice(0, 140)}“`),
    });
  }
  if (nurKodiert.length) {
    funde.push({
      id: "base64",
      kategorie: "wasserzeichen",
      schwere: "mittel",
      titel: `${nurKodiert.length} Base64-kodierte Textstelle${nurKodiert.length > 1 ? "n" : ""}`,
      detail: "Zeichenketten, die dekodiert lesbaren Text ergeben. In einer Prüfungsantwort ungewöhnlich — der Inhalt wird angezeigt.",
      stellen: nurKodiert.map((t) => t.stelle),
      belege: nurKodiert.slice(0, 3).map((t) => `Dekodiert: „${(t.klartext ?? "").slice(0, 140)}“`),
    });
  }
  return funde;
};

// Sonder-Alphabete, Zalgo, zerlegte Umlaute
const pruefeVerschleierung: Pruefung = (text) => {
  const funde: Fund[] = [];
  const alpha = alle(text, /[\u{1D400}-\u{1D7FF}！-～\u{1F130}-\u{1F189}Ⓐ-ⓩ]+/u);
  if (alpha.length) {
    funde.push({
      id: "sonderalphabet",
      kategorie: "wasserzeichen",
      schwere: "mittel",
      titel: `${alpha.length}× Sonder-Alphabet (𝐟𝐞𝐭𝐭, Ｖｏｌｌｂｒｅｉｔｅ, Ⓚⓡⓔⓘⓢ)`,
      detail: "Buchstaben aus mathematischen oder Vollbreite-Alphabeten sehen normal aus, sind für Such- und Prüffilter aber andere Zeichen. Sie werden genutzt, um Filter zu umgehen, oder stammen aus „Fancy-Text“-Generatoren.",
      stellen: alpha,
      belege: alpha.slice(0, 3).map((s) => `${text.slice(s.start, s.ende)} → ${text.slice(s.start, s.ende).normalize("NFKC")}`),
    });
  }
  const zalgo = alle(text, /\p{L}[̀-ͯ҃-҉᪰-᫿᷀-᷿⃐-⃿︠-︯]{2,}/u);
  if (zalgo.length) {
    funde.push({
      id: "zalgo",
      kategorie: "wasserzeichen",
      schwere: "hoch",
      titel: `${zalgo.length} Buchstaben mit gestapelten Zusatzzeichen`,
      detail: "Mehrere kombinierende Zeichen auf einem Buchstaben verändern die Zeichenfolge, ohne dass es auffällt — eine Technik, um Text-Vergleiche und Filter zu stören.",
      stellen: zalgo,
    });
  }
  const nfd = alle(text, /[aouAOU]̈|[eE][́̀]/);
  if (nfd.length >= 2) {
    funde.push({
      id: "nfd",
      kategorie: "paste",
      schwere: "info",
      titel: `${nfd.length} zerlegte Umlaute`,
      detail: "Umlaute als Buchstabe + separate Pünktchen (Unicode NFD). Entsteht beim Kopieren aus PDFs und manchen macOS-Programmen, nicht beim Tippen in ein Formular.",
      stellen: nfd,
    });
  }
  return funde;
};

const PRUEFUNGEN: Pruefung[] = [pruefeUnsichtbar, pruefeVerschleierung, pruefeMarkup, pruefeChatreste, pruefePaste, pruefeStil, pruefeInjection];

// ───────────────────────── Bewertung ─────────────────────────

const GEWICHT: Record<Schwere, number> = { info: 0, mittel: 1, hoch: 3 };

// Schwache Hinweise, die für sich allein nichts bedeuten, gemeinsam aber auf
// eine eingefügte Chat-Antwort deuten. Typografische Leerzeichen zählen nicht.
const SCHWACHE_KI_HINWEISE = new Set(["chat-gliederung", "floskeln", "uebergaenge", "burstiness", "ueberschriften", "geviertstrich", "emoji", "zwischenablage", "unicode-bindestrich"]);

export function bewerte(funde: Fund[]): { ampel: Ampel; punkte: number } {
  let punkte = funde.reduce((a, f) => a + GEWICHT[f.schwere], 0);
  const schwach = funde.filter((f) => f.schwere === "info" && SCHWACHE_KI_HINWEISE.has(f.id));
  if (schwach.length >= 2) punkte += schwach.length >= 3 ? 2 : 1;
  const ampel: Ampel = funde.some((f) => f.schwere === "hoch") || punkte >= 4 ? "rot" : punkte >= 1 ? "gelb" : "gruen";
  return { ampel, punkte };
}

const SCHWERE_RANG: Record<Schwere, number> = { hoch: 0, mittel: 1, info: 2 };

export function pruefeText(text: string, optionen: { modus?: Modus; zusatzFunde?: Fund[] } = {}): Ergebnis {
  const modus = optionen.modus ?? "online";
  const funde = [...PRUEFUNGEN.flatMap((p) => p(text, modus)), ...(optionen.zusatzFunde ?? [])];
  funde.sort((a, b) => SCHWERE_RANG[a.schwere] - SCHWERE_RANG[b.schwere]);
  for (const f of funde) {
    if (!f.belege && f.stellen.length) f.belege = [...new Set(f.stellen.slice(0, 6).map((s) => ausschnitt(text, s)))].slice(0, 3);
  }
  const { ampel, punkte } = bewerte(funde);
  return {
    ampel,
    punkte,
    funde,
    statistik: {
      zeichen: text.length,
      woerter: zaehleWoerter(text),
      saetze: saetze(text).length,
      absaetze: text.split(/\n\s*\n/).filter((a) => a.trim()).length,
    },
  };
}
