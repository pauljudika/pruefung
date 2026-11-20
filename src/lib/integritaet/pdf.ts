// Liest eine PDF-Abgabe: Text, Metadaten, Kommentare/Links und — wichtig —
// Text, den ein Mensch nicht sieht, eine KI aber mitliest (weiße Schrift,
// unsichtbarer Render-Modus, Mini-Schrift, Text außerhalb der Seite).
//
// pdf.js wird hereingereicht, damit dieselbe Datei im Browser (pdfjs-dist)
// und auf dem Server/in Tests (pdfjs-dist/legacy) läuft.

import type { Fund, Stelle } from "./pruefe";

// Nur die Teile von pdf.js, die hier gebraucht werden
type PdfJs = {
  getDocument: (src: { data: Uint8Array; isEvalSupported?: boolean; disableFontFace?: boolean }) => { promise: Promise<PdfDoc> };
  OPS: Record<string, number>;
};
type PdfDoc = {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
  getMetadata: () => Promise<{ info?: Record<string, unknown> }>;
};
type TextItem = { str: string; transform: number[]; hasEOL?: boolean };
type PdfPage = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  getTextContent: () => Promise<{ items: (TextItem | { type: string })[] }>;
  getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[][] }>;
  getAnnotations: () => Promise<{ subtype?: string; contentsObj?: { str?: string }; contents?: string; url?: string; unsafeUrl?: string }[]>;
};

export type PdfMeta = {
  seiten: number;
  erzeuger?: string;
  programm?: string;
  erstellt?: string;
  geaendert?: string;
  autorVorhanden: boolean;
};

export type PdfBefund = { text: string; meta: PdfMeta; funde: Fund[] };

function pdfDatum(d: unknown): string | undefined {
  if (typeof d !== "string") return undefined;
  const m = d.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
  if (!m) return undefined;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4] ?? "00"}:${m[5] ?? "00"}:${m[6] ?? "00"}Z`;
}

function weiss(hex: unknown): boolean {
  if (typeof hex !== "string") return false;
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return !!m && [m[1], m[2], m[3]].every((x) => parseInt(x, 16) >= 0xf0);
}

export async function liesPdf(daten: Uint8Array, pdfjs: PdfJs): Promise<PdfBefund> {
  const doc = await pdfjs.getDocument({ data: daten, isEvalSupported: false, disableFontFace: true }).promise;
  const OPS = pdfjs.OPS;
  let text = "";
  const versteckt: { stelle?: Stelle; art: string; inhalt: string }[] = [];
  const nebentexte: { titel: string; inhalt: string }[] = [];
  let ocrSeiten = 0;

  for (let n = 1; n <= doc.numPages; n++) {
    const seite = await doc.getPage(n);
    const vp = seite.getViewport({ scale: 1 });
    const inhalt = await seite.getTextContent();
    const seitenStart = text.length;

    // Sichtbarer Text + Mini-Schrift + außerhalb der Seite
    for (const it of inhalt.items) {
      if (!("str" in it)) continue;
      const start = text.length;
      text += it.str;
      const [a, b, c, d, x, y] = it.transform;
      const groesse = Math.hypot(c, d) || Math.hypot(a, b);
      const s = { start, ende: text.length };
      if (it.str.trim()) {
        if (groesse > 0 && groesse < 2) versteckt.push({ stelle: s, art: `Mini-Schrift (${groesse.toFixed(1)} pt)`, inhalt: it.str });
        else if (x > vp.width + 2 || y > vp.height + 2 || x + it.str.length * groesse * 0.3 < -2 || y < -groesse) versteckt.push({ stelle: s, art: "außerhalb der Seite", inhalt: it.str });
      }
      if (it.hasEOL) text += "\n";
    }

    // Unsichtbarer Render-Modus und weiße Schrift aus der Zeichenliste
    const ops = await seite.getOperatorList();
    let modus = 0;
    let fuellung: unknown = "#000000";
    const stapel: { modus: number; fuellung: unknown }[] = [];
    let hatBild = false;
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      const args = ops.argsArray[i] ?? [];
      if (fn === OPS.save) stapel.push({ modus, fuellung });
      else if (fn === OPS.restore) ({ modus, fuellung } = stapel.pop() ?? { modus, fuellung });
      else if (fn === OPS.setTextRenderingMode) modus = Number(args[0]);
      else if (fn === OPS.setFillRGBColor) fuellung = args[0];
      else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject || fn === OPS.paintImageMaskXObject) hatBild = true;
      else if (fn === OPS.showText || fn === OPS.showSpacedText) {
        const unsichtbar = modus === 3 || modus === 7;
        if (!unsichtbar && !weiss(fuellung)) continue;
        const glyphen = (args[0] as unknown[]) ?? [];
        const t = glyphen.map((g) => (g && typeof g === "object" && "unicode" in g ? String((g as { unicode: string }).unicode) : typeof g === "number" && g < -200 ? " " : "")).join("");
        if (!t.trim()) continue;
        versteckt.push({ art: unsichtbar ? (hatBild ? "OCR" : "unsichtbarer Render-Modus") : "weiße Schrift", inhalt: t });
      }
    }
    // OCR-Textebene eines Scans ist legitim unsichtbar
    const ocr = versteckt.filter((v) => v.art === "OCR");
    if (ocr.length) ocrSeiten++;
    for (let k = versteckt.length - 1; k >= 0; k--) if (versteckt[k].art === "OCR") versteckt.splice(k, 1);

    // Kommentare und Links
    for (const an of await seite.getAnnotations()) {
      const inh = an.contentsObj?.str ?? an.contents;
      if (inh && inh.trim()) nebentexte.push({ titel: `Kommentar S. ${n}`, inhalt: inh });
      const url = an.url ?? an.unsafeUrl;
      if (url) nebentexte.push({ titel: `Link S. ${n}`, inhalt: url });
    }
    if (text.length > seitenStart) text += "\n\n";
  }

  // Versteckte Stücke aus der Zeichenliste im Text verorten
  for (const v of versteckt) {
    if (v.stelle) continue;
    const kern = v.inhalt.trim().slice(0, 60);
    const pos = kern ? text.indexOf(kern) : -1;
    if (pos >= 0) v.stelle = { start: pos, ende: pos + Math.min(v.inhalt.trim().length, text.length - pos) };
  }

  const meta = await doc.getMetadata().catch(() => ({ info: {} as Record<string, unknown> }));
  const info = (meta.info ?? {}) as Record<string, unknown>;
  const eigenschaften = ["Title", "Subject", "Keywords"].map((k) => info[k]).filter((x): x is string => typeof x === "string" && !!x.trim());
  if (eigenschaften.length) nebentexte.push({ titel: "Dokument-Eigenschaften", inhalt: eigenschaften.join("\n") });

  text = text.replace(/\n+$/, "");
  const nebenStellen: Stelle[] = [];
  const nebenTitel = new Set<string>();
  for (const nt of nebentexte) {
    text += `\n\n[${nt.titel}]\n`;
    const s = text.length;
    text += nt.inhalt;
    nebenStellen.push({ start: s, ende: text.length });
    nebenTitel.add(nt.titel.replace(/ S\. \d+$/, ""));
  }

  const funde: Fund[] = [];
  if (versteckt.length) {
    const arten = [...new Set(versteckt.map((v) => v.art))];
    funde.push({
      id: "pdf-versteckt",
      kategorie: "dokument",
      schwere: "hoch",
      titel: `${versteckt.length} unsichtbare Textstelle${versteckt.length > 1 ? "n" : ""} im PDF`,
      detail: `Text, der im PDF nicht zu sehen ist (${arten.join(", ")}), den eine KI beim Einlesen aber mitliest. Typischer Trick, um der Korrektur-KI Anweisungen unterzuschieben.`,
      stellen: versteckt.filter((v) => v.stelle).map((v) => v.stelle!),
      belege: versteckt.slice(0, 4).map((v) => `${v.art}: „${v.inhalt.trim().slice(0, 140)}“`),
    });
  }
  if (ocrSeiten) {
    funde.push({
      id: "pdf-ocr",
      kategorie: "dokument",
      schwere: "info",
      titel: `${ocrSeiten} gescannte Seite${ocrSeiten > 1 ? "n" : ""} mit Texterkennung`,
      detail: "Die Seite ist ein Bild mit unsichtbarer Texterkennungs-Ebene (OCR). Das ist bei Scans normal; geprüft wird der erkannte Text.",
      stellen: [],
    });
  }
  if (nebenStellen.length) {
    funde.push({
      id: "pdf-nebenbereiche",
      kategorie: "dokument",
      schwere: "info",
      titel: `Text außerhalb der Seiten: ${[...nebenTitel].join(", ")}`,
      detail: "Kommentare, Link-Ziele und Dokument-Eigenschaften wurden unten angehängt und mitgeprüft.",
      stellen: nebenStellen,
    });
  }

  const programm = typeof info.Creator === "string" ? info.Creator : undefined;
  const erzeuger = typeof info.Producer === "string" ? info.Producer : undefined;
  const beide = `${programm ?? ""} ${erzeuger ?? ""}`;
  if (/Skia\/PDF|Chrom|Edge|Firefox|Safari|WebKit|Quartz PDFContext.*(?:Safari|Chrome)|wkhtmltopdf|Prince|WeasyPrint|Puppeteer|Playwright|HeadlessChrome/i.test(beide)) {
    funde.push({
      id: "pdf-browser",
      kategorie: "dokument",
      schwere: "mittel",
      titel: "PDF wurde aus dem Browser gedruckt",
      detail: `Erzeugt mit „${erzeuger ?? programm}“ — das PDF stammt aus einem Webbrowser, nicht aus einem Textprogramm. Typisch, wenn eine Webseite oder Chat-Antwort direkt als PDF gespeichert wurde.`,
      stellen: [],
    });
  } else if (/ReportLab|PyPDF|pdfkit|FPDF|iText|PDFsharp|Pandoc|python|node|jsPDF|Aspose/i.test(beide)) {
    funde.push({
      id: "pdf-software",
      kategorie: "dokument",
      schwere: "mittel",
      titel: `PDF von Software erzeugt: ${(erzeuger ?? programm ?? "").slice(0, 40)}`,
      detail: "Das PDF wurde nicht mit einem üblichen Textprogramm, sondern von einer Programmbibliothek oder einem Konverter erstellt.",
      stellen: [],
    });
  }
  const erstellt = pdfDatum(info.CreationDate);
  const geaendert = pdfDatum(info.ModDate);

  return {
    text,
    funde,
    meta: { seiten: doc.numPages, erzeuger, programm, erstellt, geaendert, autorVorhanden: typeof info.Author === "string" && !!info.Author.trim() },
  };
}
