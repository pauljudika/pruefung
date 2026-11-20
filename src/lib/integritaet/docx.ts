// Liest eine .docx-Datei: Text, Formatierung je Textstück und Metadaten.
// Kein DOM, keine Browser-APIs — läuft auch auf dem Server.

import { unzipSync, strFromU8 } from "fflate";
import type { Fund, Stelle } from "./pruefe";

export type DocxMeta = {
  anwendung?: string;
  bearbeitungsMinuten?: number;
  woerterLautDatei?: number;
  revision?: number;
  erstellt?: string;
  geaendert?: string;
  autorVorhanden: boolean;
  autorUngleichBearbeiter: boolean;
};

export type DocxBefund = {
  text: string;
  meta: DocxMeta;
  funde: Fund[];
  standardSchrift?: string;
};

type Lauf = { start: number; ende: number; schrift?: string; hintergrund?: string; markierung?: string; mono: boolean; link: boolean; versteckt?: string; bereich?: string };

function xmlDecode(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&");
}

function tag(xml: string | undefined, name: string): string | undefined {
  if (!xml) return undefined;
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? xmlDecode(m[1]).trim() : undefined;
}

const WEB_SCHRIFTEN = /s[öo]hne|ui-sans-serif|ui-serif|ui-monospace|system-ui|-apple-system|blinkmacsystemfont|segoe ui|\binter\b|helvetica neue|styrene|tiempos|copernicus|google sans|roboto|noto sans|open sans|source sans/i;
const MONO = /courier|consolas|menlo|monaco|monospace|mono\b|sfmono|fira code|jetbrains/i;

const TEILE = /^(?:word\/(?:document|styles|footnotes|endnotes|comments|header\d*|footer\d*)\.xml|docProps\/(?:app|core|custom)\.xml)$/;

function istWeiss(hex?: string): boolean {
  if (!hex || !/^[0-9a-f]{6}$/i.test(hex)) return false;
  return [0, 2, 4].every((i) => parseInt(hex.slice(i, i + 2), 16) >= 0xf0);
}

export function liesDocx(daten: Uint8Array): DocxBefund {
  const dateien = unzipSync(daten, { filter: (f) => TEILE.test(f.name) });
  const doc = dateien["word/document.xml"];
  if (!doc) throw new Error("Keine gültige Word-Datei (word/document.xml fehlt).");
  const lies = (n: string) => (dateien[n] ? strFromU8(dateien[n]) : undefined);
  const xml = strFromU8(doc);
  const styles = lies("word/styles.xml") ?? "";
  const app = lies("docProps/app.xml");
  const core = lies("docProps/core.xml");

  const defaults = styles.match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/)?.[0] ?? "";
  const standardSchrift = defaults.match(/<w:rFonts [^>]*w:ascii="([^"]+)"/)?.[1] ?? (defaults.includes("minorHAnsi") ? "(Design-Schrift)" : undefined);
  // Zeichenformatvorlagen, die Text verstecken
  const versteckteStile = new Set<string>();
  for (const st of styles.match(/<w:style\b[\s\S]*?<\/w:style>/g) ?? []) {
    const id = st.match(/w:styleId="([^"]+)"/)?.[1];
    if (id && (/<w:vanish\s*\/>|<w:vanish w:val="(?:true|1|on)"/.test(st) || istWeiss(st.match(/<w:color w:val="([0-9A-Fa-f]{6})"/)?.[1]))) versteckteStile.add(id);
  }

  let text = "";
  const laeufe: Lauf[] = [];

  function teilLesen(teilXml: string, bereich: string) {
    const absaetze = teilXml.match(/<w:p\b[^>]*\/>|<w:p\b[^>]*>[\s\S]*?<\/w:p>/g) ?? [];
    for (const p of absaetze) {
      const teile = p.split(/(<w:hyperlink\b[\s\S]*?<\/w:hyperlink>)/);
      for (const teil of teile) {
        const imLink = teil.startsWith("<w:hyperlink");
        const runs = teil.match(/<w:r\b(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g) ?? [];
        for (const r of runs) {
          let t = "";
          const inhalt = r.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/, "");
          const re = /<w:(?:t|delText)(?:\s[^>]*)?>([\s\S]*?)<\/w:(?:t|delText)>|<w:tab\/>|<w:br\/>|<w:noBreakHyphen\/>|<w:softHyphen\/>/g;
          let m: RegExpExecArray | null;
          while ((m = re.exec(inhalt)) !== null) {
            if (m[1] !== undefined) t += xmlDecode(m[1]);
            else if (m[0] === "<w:tab/>") t += "\t";
            else if (m[0] === "<w:br/>") t += "\n";
            else if (m[0] === "<w:noBreakHyphen/>") t += "‑";
            else if (m[0] === "<w:softHyphen/>") t += "­";
          }
          if (!t) continue;
          const rpr = r.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/)?.[1] ?? "";
          const schrift = rpr.match(/<w:rFonts [^>]*w:(?:ascii|hAnsi)="([^"]+)"/)?.[1];
          const fill = rpr.match(/<w:shd [^>]*w:fill="([0-9A-Fa-f]{6})"/)?.[1];
          const hl = rpr.match(/<w:highlight w:val="(\w+)"/)?.[1];
          const farbe = rpr.match(/<w:color w:val="([0-9A-Fa-f]{6})"/)?.[1];
          const groesse = Number(rpr.match(/<w:sz w:val="(\d+)"/)?.[1] ?? 0);
          const stil = rpr.match(/<w:rStyle w:val="([^"]+)"/)?.[1];
          let versteckt: string | undefined;
          if (/<w:(?:vanish|webHidden|specVanish)\s*\/>|<w:(?:vanish|webHidden)\s+w:val="(?:true|1|on)"/.test(rpr)) versteckt = "ausgeblendet";
          else if (stil && versteckteStile.has(stil)) versteckt = "über Formatvorlage versteckt";
          else if (istWeiss(farbe) && (!fill || istWeiss(fill))) versteckt = "weiße Schrift";
          else if (farbe && fill && farbe.toUpperCase() === fill.toUpperCase()) versteckt = "Schrift in Hintergrundfarbe";
          else if (hl === "white" && istWeiss(farbe)) versteckt = "weiß auf weiß";
          else if (groesse > 0 && groesse <= 4) versteckt = `Mini-Schrift (${groesse / 2} pt)`;
          if (/<w:delText/.test(r)) versteckt = "gelöschter Text (Änderungsverfolgung)";
          laeufe.push({
            start: text.length,
            ende: text.length + t.length,
            schrift,
            hintergrund: fill && !istWeiss(fill) && !versteckt ? fill : undefined,
            markierung: hl && hl !== "none" ? hl : undefined,
            mono: !!schrift && MONO.test(schrift),
            link: imLink,
            versteckt,
            bereich,
          });
          text += t;
        }
      }
      text += "\n";
    }
  }

  const body = xml.match(/<w:body>([\s\S]*)<\/w:body>/)?.[1] ?? xml;
  teilLesen(body, "Haupttext");

  // Nebenbereiche: dort wird Text gern versteckt, weil ihn niemand liest — eine KI aber schon
  const nebenbereiche: string[] = [];
  const neben = (titel: string, inhalt: string) => {
    if (!inhalt.trim()) return;
    text = text.replace(/\n+$/, "") + `\n\n[${titel}]\n`;
    nebenbereiche.push(titel);
  };
  for (const [name, titel] of [
    ...Object.keys(dateien).filter((n) => /^word\/header\d*\.xml$/.test(n)).map((n) => [n, "Kopfzeile"]),
    ...Object.keys(dateien).filter((n) => /^word\/footer\d*\.xml$/.test(n)).map((n) => [n, "Fußzeile"]),
    ["word/footnotes.xml", "Fußnoten"],
    ["word/endnotes.xml", "Endnoten"],
    ["word/comments.xml", "Kommentare"],
  ]) {
    const x = lies(name);
    if (!x) continue;
    // Trenn-Fußnoten (Typ separator) überspringen
    const ohneTrenner = x.replace(/<w:(?:footnote|endnote) [^>]*w:type="(?:separator|continuationSeparator)"[\s\S]*?<\/w:(?:footnote|endnote)>/g, "");
    if (!/<w:t[\s>]/.test(ohneTrenner)) continue;
    neben(titel, "x");
    teilLesen(ohneTrenner, titel);
  }
  const alt = [...xml.matchAll(/<wp:docPr\b[^>]*\bdescr="([^"]+)"/g)].map((m) => xmlDecode(m[1]));
  if (alt.length) {
    neben("Alternativtext von Bildern", "x");
    const s = text.length;
    text += alt.join("\n") + "\n";
    laeufe.push({ start: s, ende: text.length - 1, mono: false, link: false, bereich: "Alternativtext" });
  }
  const eigenschaften = [
    ...["dc:title", "dc:subject", "dc:description", "cp:keywords", "cp:category"].map((t) => tag(core, t)),
    ...[...(lies("docProps/custom.xml") ?? "").matchAll(/<vt:lpwstr>([\s\S]*?)<\/vt:lpwstr>/g)].map((m) => xmlDecode(m[1])),
  ].filter((x): x is string => !!x && x.trim().length > 0);
  if (eigenschaften.length) {
    neben("Dokument-Eigenschaften", "x");
    const s = text.length;
    text += eigenschaften.join("\n") + "\n";
    laeufe.push({ start: s, ende: text.length - 1, mono: false, link: false, bereich: "Eigenschaften" });
  }
  text = text.replace(/\n+$/, "");

  const funde: Fund[] = [];

  const versteckt = laeufe.filter((l) => l.versteckt && text.slice(l.start, l.ende).trim());
  if (versteckt.length) {
    const arten = [...new Set(versteckt.map((l) => l.versteckt!))];
    funde.push({
      id: "docx-versteckt",
      kategorie: "dokument",
      schwere: "hoch",
      titel: `${versteckt.length} unsichtbare Textstelle${versteckt.length > 1 ? "n" : ""} im Word-Dokument`,
      detail: `Text, der beim Lesen oder Ausdrucken nicht sichtbar ist (${arten.join(", ")}), den eine KI beim Einlesen aber vollständig mitliest. Klassischer Trick, um der Korrektur-KI Anweisungen unterzuschieben.`,
      stellen: versteckt.map((l) => ({ start: l.start, ende: l.ende })),
      belege: versteckt.slice(0, 4).map((l) => `${l.versteckt}: „${text.slice(l.start, l.ende).trim().slice(0, 140)}“`),
    });
  }
  if (nebenbereiche.length) {
    const neben = laeufe.filter((l) => l.bereich && l.bereich !== "Haupttext");
    funde.push({
      id: "docx-nebenbereiche",
      kategorie: "dokument",
      schwere: "info",
      titel: `Text außerhalb des Haupttexts: ${nebenbereiche.join(", ")}`,
      detail: "Diese Bereiche wurden mitgeprüft und unten an den Text angehängt. Bei Prüfungsabgaben sind sie meist leer — Inhalte dort verdienen einen Blick.",
      stellen: neben.map((l) => ({ start: l.start, ende: l.ende })),
    });
  }

  // Schriften: dominante Schrift nach Zeichenzahl
  const anteil = new Map<string, number>();
  for (const l of laeufe.filter((x) => !x.versteckt && (x.bereich ?? "Haupttext") === "Haupttext")) {
    const k = l.schrift ?? "(Standard)";
    anteil.set(k, (anteil.get(k) ?? 0) + (l.ende - l.start));
  }
  const dominant = [...anteil.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const fremd = laeufe.filter((l) => !l.versteckt && (l.bereich ?? "Haupttext") === "Haupttext" && (l.schrift ?? "(Standard)") !== dominant && text.slice(l.start, l.ende).trim().length > 2);
  const webLaeufe = laeufe.filter((l) => l.schrift && WEB_SCHRIFTEN.test(l.schrift));
  if (webLaeufe.length) {
    const namen = [...new Set(webLaeufe.map((l) => l.schrift!))];
    funde.push({
      id: "docx-webschrift",
      kategorie: "dokument",
      schwere: "hoch",
      titel: `Web-Schriftart im Dokument: ${namen.slice(0, 3).join(", ")}`,
      detail:
        "Diese Schriften kommen nicht aus Word, sondern aus Webseiten und Chat-Oberflächen (ChatGPT etwa verwendet „Söhne“, viele Seiten „ui-sans-serif“ oder „Segoe UI“). Sie landen im Dokument, wenn Text mit Formatierung aus dem Browser eingefügt wird.",
      stellen: webLaeufe.map((l) => ({ start: l.start, ende: l.ende })),
    });
  }
  const fremdOhneWeb = fremd.filter((l) => !webLaeufe.includes(l));
  if (fremdOhneWeb.length && dominant) {
    const namen = [...new Set(fremdOhneWeb.map((l) => l.schrift ?? "(Standard)"))];
    const zeichen = fremdOhneWeb.reduce((a, l) => a + l.ende - l.start, 0);
    funde.push({
      id: "docx-schriftmix",
      kategorie: "dokument",
      schwere: zeichen > 80 ? "mittel" : "info",
      titel: `${fremdOhneWeb.length} Textstellen in abweichender Schrift`,
      detail: `Der Großteil ist in „${dominant}“ gesetzt, diese Stellen aber in ${namen.map((n) => `„${n}“`).join(", ")}. Abweichende Schriften sind ein typisches Zeichen für eingefügten Text, der seine Herkunftsformatierung behalten hat.`,
      stellen: fremdOhneWeb.map((l) => ({ start: l.start, ende: l.ende })),
    });
  }

  const hinterlegt = laeufe.filter((l) => l.hintergrund);
  if (hinterlegt.length) {
    funde.push({
      id: "docx-hintergrund",
      kategorie: "dokument",
      schwere: "mittel",
      titel: `${hinterlegt.length} Textstellen mit Hintergrundfarbe`,
      detail: "Hintergrundfarben (Schattierung) übernimmt Word beim Einfügen aus Webseiten oder Chat-Fenstern im Dunkelmodus — selbst gesetzt werden sie selten.",
      stellen: hinterlegt.map((l) => ({ start: l.start, ende: l.ende })),
    });
  }

  const mono = laeufe.filter((l) => l.mono && !webLaeufe.includes(l));
  if (mono.length) {
    funde.push({
      id: "docx-mono",
      kategorie: "dokument",
      schwere: "mittel",
      titel: `${mono.length} Textstellen in Code-Schrift`,
      detail: "Schreibmaschinen-Schriften wie Consolas oder Courier stammen typischerweise aus Code-Blöcken in Chat-Antworten.",
      stellen: mono.map((l) => ({ start: l.start, ende: l.ende })),
    });
  }

  // Metadaten
  const hauptEnde = Math.max(0, ...laeufe.filter((l) => l.bereich === "Haupttext" && !l.versteckt).map((l) => l.ende));
  const woerterText = (text.slice(0, hauptEnde).match(/[\p{L}\p{N}]+/gu) ?? []).length;
  const minuten = tag(app, "TotalTime");
  const revision = tag(core, "cp:revision");
  const erstellt = tag(core, "dcterms:created");
  const geaendert = tag(core, "dcterms:modified");
  const autor = tag(core, "dc:creator");
  const bearbeiter = tag(core, "cp:lastModifiedBy");
  const meta: DocxMeta = {
    anwendung: tag(app, "Application"),
    bearbeitungsMinuten: minuten !== undefined ? Number(minuten) : undefined,
    woerterLautDatei: tag(app, "Words") ? Number(tag(app, "Words")) : undefined,
    revision: revision ? Number(revision) : undefined,
    erstellt,
    geaendert,
    // Namen werden bewusst nicht ausgegeben (Pseudonymisierung)
    autorVorhanden: !!autor,
    autorUngleichBearbeiter: !!autor && !!bearbeiter && autor !== bearbeiter,
  };

  const ganz: Stelle[] = [];
  if (meta.bearbeitungsMinuten !== undefined && woerterText >= 150) {
    const min = meta.bearbeitungsMinuten;
    const tempo = min > 0 ? woerterText / min : Infinity;
    if (tempo > 25) {
      funde.push({
        id: "docx-zeit",
        kategorie: "dokument",
        schwere: tempo > 40 ? "hoch" : "mittel",
        titel: `${woerterText} Wörter in ${min} Min. Bearbeitungszeit`,
        detail: `Laut Word war das Dokument insgesamt nur ${min} Minute${min === 1 ? "" : "n"} zur Bearbeitung geöffnet${min > 0 ? ` — das wären ${Math.round(tempo)} Wörter pro Minute` : ""}. Beim Formulieren schafft ein Mensch meist 10–25 Wörter pro Minute. Ein so hoher Wert spricht dafür, dass der Text größtenteils eingefügt wurde. (Wird das Dokument per „Speichern unter“ aus einer anderen Datei erzeugt, kann der Wert ebenfalls niedrig sein.)`,
        stellen: ganz,
      });
    }
  }
  if (meta.revision !== undefined && meta.revision <= 2 && woerterText >= 300) {
    funde.push({
      id: "docx-revision",
      kategorie: "dokument",
      schwere: "info",
      titel: `Nur ${meta.revision} Speichervorgang${meta.revision === 1 ? "" : "e"} bei ${woerterText} Wörtern`,
      detail: "Ein längerer, selbst geschriebener Text wird meist mehrfach zwischengespeichert. Wenige Speichervorgänge allein beweisen nichts.",
      stellen: ganz,
    });
  }
  if (meta.erstellt && meta.geaendert && woerterText >= 200) {
    const dauer = (Date.parse(meta.geaendert) - Date.parse(meta.erstellt)) / 60000;
    if (dauer >= 0 && dauer < woerterText / 40) {
      funde.push({
        id: "docx-erstellt",
        kategorie: "dokument",
        schwere: "mittel",
        titel: `Erstellt und fertig in ${Math.max(0, Math.round(dauer))} Minuten`,
        detail: `Zwischen Anlegen und letzter Änderung der Datei liegen nur ${Math.round(dauer)} Minuten — für ${woerterText} Wörter sehr wenig.`,
        stellen: ganz,
      });
    }
  }
  if (meta.anwendung && !/word|libreoffice|openoffice|pages|wps|google|onlyoffice/i.test(meta.anwendung)) {
    funde.push({
      id: "docx-anwendung",
      kategorie: "dokument",
      schwere: "mittel",
      titel: `Erzeugt von „${meta.anwendung}“`,
      detail: "Die Datei wurde nicht mit einem üblichen Textprogramm, sondern von einer Software oder einem Konverter erstellt.",
      stellen: ganz,
    });
  }
  if (meta.autorUngleichBearbeiter) {
    funde.push({
      id: "docx-autor",
      kategorie: "dokument",
      schwere: "info",
      titel: "Ersteller und letzter Bearbeiter unterscheiden sich",
      detail: "Die Datei wurde unter einem anderen Benutzerkonto angelegt als zuletzt gespeichert. Namen werden aus Datenschutzgründen nicht angezeigt.",
      stellen: ganz,
    });
  }

  return { text, meta, funde, standardSchrift };
}
