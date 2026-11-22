// Wertet ALLE Formate der Zwischenablage aus. Beim Einfügen liefern Browser
// neben dem Klartext oft HTML, RTF und programmeigene Formate mit — und die
// verraten die Quelle, auch wenn der Klartext völlig unauffällig ist.

import type { Fund } from "./pruefe";

export type Zwischenablage = {
  typen: string[];
  daten: Record<string, string>;
};

export type Herkunft = {
  quelle: string;
  schwere: "hoch" | "mittel" | "info";
  hinweise: string[];
};

type Regel = { re: RegExp; quelle: string; hinweis: string; schwere: Herkunft["schwere"]; feld: "html" | "rtf" | "typen" };

// Reihenfolge = Priorität: die erste passende Regel bestimmt die Quelle
// Bewusst KEINE Produktnamen bei Chat-Oberflächen: Klassen und Attribute
// ändern sich ständig und werden zwischen Produkten geteilt (z. B. enthalten
// VS-Code-Ableger Copilot-Klassen). Wir benennen nur, was eindeutig ist.
const KI_CHAT = "KI-Chat-Oberfläche";
const REGELN: Regel[] = [
  // Code-Editoren zuerst: deren HTML enthält oft Klassen anderer KI-Produkte
  { feld: "typen", re: /vscode-editor-data|code-editor|monaco/i, quelle: "Code-Editor (VS-Code-basiert)", hinweis: "Editor-eigenes Zwischenablage-Format", schwere: "hoch" },
  { feld: "html", re: /font-family:\s*(?:Menlo|Consolas|'?Droid Sans Mono|'?Cascadia|'?JetBrains|'?Fira Code)[^;]*;[^"]*white-space:\s*pre/i, quelle: "Code-Editor (VS-Code-basiert)", hinweis: "Editor-Formatierung (Monospace, white-space: pre)", schwere: "hoch" },
  // KI-Chats im Browser — Merkmale ohne Produktzuordnung
  { feld: "html", re: /data-start="\d+"[^>]*data-end="\d+"|data-message-author-role|data-is-streaming|font-claude|claude-response|model-response|markdown-main-panel|response-container|class="[^"]*markdown prose/i, quelle: KI_CHAT, hinweis: "Attribute/Klassen einer KI-Chat-Antwort", schwere: "hoch" },
  { feld: "html", re: /class="[^"]*\b(?:prose|whitespace-pre-wrap|break-words)\b/i, quelle: KI_CHAT, hinweis: "Tailwind-Klassen typischer Chat-Oberflächen", schwere: "hoch" },
  // Chat- und Messenger-Apps mit dem Editor „texty“: Slack und – beobachtet am 22.11.2026 – die ChatGPT-/Codex-Desktop-App.
  // Deren HTML trägt keine verräterischen Klassen; das Zusatzformat der Zwischenablage ist die einzige Spur.
  { feld: "typen", re: /slack\/texty/i, quelle: "Chat-App (Editorformat „texty“: u. a. ChatGPT-/Codex-App, Slack)", hinweis: "Zwischenablage-Format einer Chat-Anwendung", schwere: "mittel" },
  // Office
  { feld: "html", re: /urn:schemas-microsoft-com:office:(?:word|office)|class="?Mso|mso-[a-z-]+:|WordSection1/i, quelle: "Microsoft Word / Outlook", hinweis: "Word-Format (Outlook schreibt Mails ebenfalls im Word-Format)", schwere: "info" },
  { feld: "rtf", re: /\\generator Microsoft Word|\\\*\\generator Msftedit|\\mmathPr/i, quelle: "Microsoft Word / Outlook", hinweis: "Word-RTF", schwere: "info" },
  { feld: "html", re: /docs-internal-guid/i, quelle: "Google Docs", hinweis: "Google-Docs-Kennung", schwere: "info" },
  { feld: "html", re: /<meta name="?generator"? content="?LibreOffice/i, quelle: "LibreOffice", hinweis: "LibreOffice-Generator", schwere: "info" },
  // Text aus einer App-Oberfläche statt aus einem Dokument
  { feld: "rtf", re: /\.AppleSystemUIFont|\.SFNS|\.SF NS|SFPro/i, quelle: "App-Oberfläche (macOS)", hinweis: "RTF mit System-Oberflächenschrift — kopiert aus einer App, nicht aus einem Dokument", schwere: "mittel" },
  { feld: "html", re: /font-family:\s*(?:-apple-system|system-ui|ui-sans-serif|BlinkMacSystemFont|"?Segoe UI Variable)/i, quelle: "App- oder Web-Oberfläche", hinweis: "System-Oberflächenschrift", schwere: "mittel" },
  { feld: "rtf", re: /\\cocoartf/i, quelle: "macOS-Programm", hinweis: "Cocoa-RTF (TextEdit, Notizen, Mail, Apps)", schwere: "info" },
  { feld: "html", re: /<a\s[^>]*href="https?:/i, quelle: "Webseite", hinweis: "Hyperlinks", schwere: "info" },
];

export function zwischenablageLesen(dt: DataTransfer): Zwischenablage {
  const typen = Array.from(dt.types ?? []);
  const daten: Record<string, string> = {};
  for (const t of typen) {
    if (t === "Files") continue;
    try {
      daten[t] = dt.getData(t);
    } catch {
      daten[t] = "";
    }
  }
  return { typen, daten };
}

export function herkunftBestimmen(z: Zwischenablage | null): Herkunft | null {
  if (!z) return null;
  const html = z.daten["text/html"] ?? "";
  const rtf = z.daten["text/rtf"] ?? z.daten["public.rtf"] ?? "";
  const typen = z.typen.join(" ");
  const nurText = z.typen.every((t) => t === "text/plain");
  if (nurText) return { quelle: "Nur Klartext", schwere: "info", hinweise: ["Die Quelle hat keine Formatierung mitgegeben (typisch für Apps, Terminals, PDF-Reader und Kopier-Schaltflächen)"] };

  const hinweise: string[] = [];
  let quelle: string | null = null;
  let schwere: Herkunft["schwere"] = "info";
  const rang = { info: 0, mittel: 1, hoch: 2 };
  for (const r of REGELN) {
    const feld = r.feld === "html" ? html : r.feld === "rtf" ? rtf : typen;
    if (feld && r.re.test(feld)) {
      if (!quelle) quelle = r.quelle;
      if (rang[r.schwere] > rang[schwere]) schwere = r.schwere;
      if (!hinweise.includes(r.hinweis)) hinweise.push(r.hinweis);
    }
  }
  const schrift = html.match(/font-family:\s*([^;"]+)/i)?.[1]?.replace(/&quot;|'/g, "").trim();
  if (schrift) hinweise.push(`Schrift: ${schrift.split(",")[0]}`);
  const rtfSchrift = rtf.match(/\\fonttbl[^;]*?\\f\d+\\f\w+\\fcharset\d+ ([^;]+);/)?.[1];
  if (rtfSchrift) hinweise.push(`RTF-Schrift: ${rtfSchrift}`);
  const fremd = z.typen.filter((t) => !["text/plain", "text/html", "text/rtf", "text/uri-list"].includes(t));
  if (fremd.length) hinweise.push(`Zusatzformate: ${fremd.join(", ")}`);

  // Formatierte Struktur, die im Klartext verloren ging (z. B. Fettdruck/Listen aus Chat-Antworten)
  const struktur = (html.match(/<(?:strong|b|h[1-6]|li)\b/gi) ?? []).length;
  if (struktur >= 3) hinweise.push(`${struktur} Struktur-Elemente (Überschriften/Fett/Listen) in der HTML-Fassung`);

  // Strukturierter Text ohne Kennung eines Textprogramms: typisch für Antworten aus
  // Chat-Apps (Desktop-Apps liefern oft schlichtes HTML ohne verräterische Klassen)
  if (!quelle && struktur >= 3) {
    return { quelle: "Formatierte Antwort aus App oder Web", schwere: "mittel", hinweise: [...hinweise, "Überschriften/Fettdruck/Listen ohne Kennung eines Textprogramms — typisch für kopierte Chat-Antworten"] };
  }
  return { quelle: quelle ?? "Formatierter Text (Web/Programm)", schwere, hinweise };
}

export function fundAusHerkunft(h: Herkunft | null): Fund[] {
  if (!h) return [];
  // Auch ein Einfügen ohne jede Formatierung ist ein Einfügen: für sich unauffällig, unter der Regel
  // „Externe Quellen verboten“ aber ein Beleg (eigene Kennung, damit es die übrige Bewertung nicht verschiebt).
  if (h.quelle === "Nur Klartext") {
    return [{
      id: "eingefuegt",
      kategorie: "paste",
      schwere: "info",
      titel: "Text wurde eingefügt, nicht getippt (nur Klartext)",
      detail: "Der Text kam über die Zwischenablage, ohne Formatierung – typisch für Apps, Terminals, PDF-Reader und Kopier-Schaltflächen. Die Quelle lässt sich daraus nicht bestimmen. Hinweis: Das beschreibt, was SIE gerade eingefügt haben.",
      stellen: [],
    }];
  }
  return [
    {
      id: "zwischenablage",
      kategorie: "paste",
      schwere: h.schwere,
      titel: `Eingefügt aus: ${h.quelle}`,
      detail: `Die mitkopierte Formatierung der Zwischenablage verrät die Quelle (${h.hinweise.join("; ")}). Hinweis: Das beschreibt, woher SIE den Text gerade kopiert haben — aussagekräftig, wenn Sie direkt aus der Abgabe kopieren oder zum Testen aus der vermuteten Quelle.`,
      stellen: [],
    },
  ];
}

/** Für Diagnose und Feintuning: welche besonderen Zeichen stecken im Text? */
export function zeicheninventar(text: string): { zeichen: string; code: string; name: string; anzahl: number }[] {
  const zaehler = new Map<string, number>();
  for (const c of text) {
    if (/[\x20-\x7E\n\r\tÄÖÜäöüß§€°²³]/.test(c)) continue;
    zaehler.set(c, (zaehler.get(c) ?? 0) + 1);
  }
  return [...zaehler.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => {
      const cp = c.codePointAt(0)!;
      return { zeichen: c, code: "U+" + cp.toString(16).toUpperCase().padStart(4, "0"), name: ZEICHEN_NAME[cp] ?? "", anzahl: n };
    });
}

const ZEICHEN_NAME: Record<number, string> = {
  0x00a0: "geschütztes Leerzeichen", 0x00ad: "weiches Trennzeichen", 0x2010: "Bindestrich (Unicode)", 0x2011: "geschützter Bindestrich",
  0x2012: "Ziffernstrich", 0x2013: "Halbgeviertstrich", 0x2014: "Geviertstrich", 0x2018: "‘", 0x2019: "’ Apostroph", 0x201a: "‚",
  0x201c: "“", 0x201d: "”", 0x201e: "„", 0x2026: "Auslassungszeichen", 0x202f: "schmales geschütztes Leerzeichen", 0x2009: "schmales Leerzeichen",
  0x200b: "Nullbreiten-Leerzeichen", 0x200c: "ZWNJ", 0x200d: "ZWJ", 0x2060: "Wortverbinder", 0xfeff: "BOM", 0x2022: "Aufzählungspunkt",
  0x2192: "Pfeil →", 0x00bb: "»", 0x00ab: "«",
};
