// Wertet die HTML-Fassung der Zwischenablage aus. Beim Einfügen liefern
// Browser neben dem Klartext oft auch HTML mit — und das verrät die Quelle.

import type { Fund } from "./pruefe";

export type Herkunft = { quelle: string; hinweise: string[] };

const MUSTER: [RegExp, string, string][] = [
  [/urn:schemas-microsoft-com:office:word|class="?Mso|mso-[a-z-]+:/i, "Microsoft Word", "Word-Formatklassen (Mso…)"],
  [/docs-internal-guid/i, "Google Docs", "Google-Docs-Kennung"],
  [/<meta name="?generator"? content="?LibreOffice/i, "LibreOffice", "LibreOffice-Generator"],
  [/data-start="\d+"[^>]*data-end="\d+"|data-message-author-role|class="[^"]*markdown prose/i, "ChatGPT", "Chat-Oberfläche mit ChatGPT-Attributen"],
  [/font-claude|claude-response|data-is-streaming/i, "Claude", "Claude-Oberflächenklassen"],
  [/model-response|response-content|gemini/i, "Gemini", "Gemini-Oberflächenklassen"],
  [/class="[^"]*\bprose\b|whitespace-pre-wrap|break-words/i, "KI-Chat / Web-App", "Tailwind-Klassen einer Chat-Oberfläche"],
  [/<a\s[^>]*href="https?:/i, "Webseite", "Hyperlinks"],
];

export function herkunftAusHtml(html: string | undefined): Herkunft | null {
  if (!html || !html.trim()) return null;
  const hinweise: string[] = [];
  let quelle: string | null = null;
  for (const [re, name, hinweis] of MUSTER) {
    if (re.test(html)) {
      quelle ??= name;
      hinweise.push(hinweis);
    }
  }
  const schrift = html.match(/font-family:\s*([^;"]+)/i)?.[1]?.replace(/&quot;|'/g, "").trim();
  if (schrift) hinweise.push(`Schrift: ${schrift.split(",")[0]}`);
  return { quelle: quelle ?? "Formatierter Text (Web/Programm)", hinweise };
}

export function fundAusHerkunft(h: Herkunft | null): Fund[] {
  if (!h) return [];
  const ki = /ChatGPT|Claude|Gemini|KI-Chat/.test(h.quelle);
  return [
    {
      id: "zwischenablage",
      kategorie: "paste",
      schwere: ki ? "hoch" : "info",
      titel: `Eingefügt aus: ${h.quelle}`,
      detail: `Die mitkopierte Formatierung der Zwischenablage verrät die Quelle (${h.hinweise.join(", ")}). Hinweis: Das beschreibt, woher SIE den Text gerade kopiert haben — nützlich, wenn Sie direkt aus der Abgabe oder dem Moodle-Export kopieren.`,
      stellen: [],
    },
  ];
}
