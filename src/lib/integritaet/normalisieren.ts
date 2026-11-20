// Macht verschleierten Text wieder lesbar — mit Rückverweis auf die
// Originalposition jedes Zeichens. So lassen sich Anweisungen finden, die
// Studierende gegen Filter getarnt haben, und trotzdem im Original markieren.
//
// Abgedeckt: unsichtbare Zeichen, Homoglyphen (kyrillisch/griechisch),
// Voll- und Mathe-Alphabete (𝐀, Ａ), kombinierende Zeichen, Leetspeak (1gn0r3),
// gesperrte Schrift (i g n o r e / i.g.n.o.r.e), Unicode-Tag-Text.

export type Normalisiert = { text: string; herkunft: number[] };

const HOMOGLYPHEN: Record<string, string> = {
  // Kyrillisch
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "і": "i", "ј": "j", "ѕ": "s", "ԁ": "d", "ɡ": "g", "һ": "h", "ӏ": "l", "ԛ": "q", "ԝ": "w", "ν": "v",
  "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M", "Н": "H", "О": "O", "Р": "P", "С": "C", "Т": "T", "Х": "X", "У": "Y", "І": "I", "Ј": "J", "Ѕ": "S",
  // Griechisch
  "α": "a", "ο": "o", "ρ": "p", "ι": "i", "κ": "k", "τ": "t", "υ": "u", "χ": "x",
  "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H", "Ι": "I", "Κ": "K", "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X",
  // Sonstige Verwechsler
  "ı": "i", "ℓ": "l", "ⅰ": "i", "ⅼ": "l", "ꓲ": "I",
};

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

const UNSICHTBAR = /[­͏؜ᅟᅠ឴឵᠎​-‏‪-‮⁠-⁯ㅤ︀-️﻿ﾠ]/;

function istTag(cp: number) {
  return cp >= 0xe0000 && cp <= 0xe007f;
}
function istVariation(cp: number) {
  return cp >= 0xe0100 && cp <= 0xe01ef;
}

/** Ein Zeichen auf seine "gemeinte" Form zurückführen. */
function grundform(c: string): string {
  if (HOMOGLYPHEN[c]) return HOMOGLYPHEN[c];
  const cp = c.codePointAt(0)!;
  // Mathematische Alphabete und Vollbreite: NFKC löst sie auf
  if ((cp >= 0x1d400 && cp <= 0x1d7ff) || (cp >= 0xff01 && cp <= 0xff5e) || (cp >= 0x2460 && cp <= 0x24ff) || (cp >= 0x1f130 && cp <= 0x1f189)) {
    return c.normalize("NFKC").toLowerCase();
  }
  return c;
}

export function normalisiere(roh: string): Normalisiert {
  // Schritt 1: Zeichen einzeln abbilden
  let text = "";
  const herkunft: number[] = [];
  let i = 0;
  for (const c of roh) {
    const cp = c.codePointAt(0)!;
    if (istTag(cp)) {
      if (cp >= 0xe0020 && cp <= 0xe007e) {
        text += String.fromCharCode(cp - 0xe0000);
        herkunft.push(i);
      }
    } else if (istVariation(cp) || UNSICHTBAR.test(c)) {
      // weglassen
    } else if (/\p{M}/u.test(c) && !/[̧̈́̀̂̌]/.test(c)) {
      // kombinierende Zeichen (Zalgo) weglassen, echte Umlaut-Punkte behalten
    } else {
      const g = grundform(c);
      for (const x of g) {
        text += x;
        herkunft.push(i);
      }
    }
    i += c.length;
  }

  // Schritt 2: Leetspeak in Wörtern, die Buchstaben und Ziffern mischen
  let t2 = "";
  const h2: number[] = [];
  const woerter = text.split(/(\s+)/);
  let p = 0;
  for (const w of woerter) {
    const gemischt = /\p{L}/u.test(w) && /[013457@$]/.test(w) && w.length >= 4 && !/^\d/.test(w) && !/^[§\d]/.test(w);
    for (let k = 0; k < w.length; k++) {
      const ch = w[k];
      t2 += gemischt && LEET[ch] ? LEET[ch] : ch;
      h2.push(herkunft[p + k]);
    }
    p += w.length;
  }

  // Schritt 3: gesperrte Schrift zusammenziehen ("i g n o r e", "i.g.n.o.r.e")
  let t3 = "";
  const h3: number[] = [];
  const re = /(?<![\p{L}\p{N}])(?:\p{L}[ ._\-*·]{1,2}){3,}\p{L}(?![\p{L}\p{N}])/gu;
  let letzte = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t2)) !== null) {
    for (let k = letzte; k < m.index; k++) {
      t3 += t2[k];
      h3.push(h2[k]);
    }
    for (let k = m.index; k < m.index + m[0].length; k++) {
      if (/\p{L}/u.test(t2[k])) {
        t3 += t2[k];
        h3.push(h2[k]);
      }
    }
    letzte = m.index + m[0].length;
  }
  for (let k = letzte; k < t2.length; k++) {
    t3 += t2[k];
    h3.push(h2[k]);
  }

  return { text: t3, herkunft: h3 };
}

/** Bereich im normalisierten Text → Bereich im Original */
export function zurueck(n: Normalisiert, start: number, ende: number, roh: string): { start: number; ende: number } {
  const a = n.herkunft[start] ?? 0;
  const b = n.herkunft[Math.max(start, ende - 1)] ?? a;
  const cp = roh.codePointAt(b) ?? 0;
  return { start: a, ende: b + (cp > 0xffff ? 2 : 1) };
}

// ───────── Kodierte Inhalte ─────────

/** Nullbreiten-Zeichen als Binärcode (z. B. ZWSP=0, ZWNJ=1) dekodieren */
export function dekodiereNullbreiteBinaer(roh: string): { start: number; ende: number; klartext: string }[] {
  const out: { start: number; ende: number; klartext: string }[] = [];
  const re = /[​‌‍⁠﻿]{16,}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(roh)) !== null) {
    const seq = m[0];
    const arten = [...new Set(seq)];
    if (arten.length < 2 || arten.length > 3) continue;
    // Häufige Kodierungen durchprobieren: jedes Paar als 0/1, 8 Bit pro Zeichen
    let bester = "";
    for (const null_ of arten) {
      for (const eins of arten) {
        if (null_ === eins) continue;
        const bits = [...seq].filter((c) => c === null_ || c === eins).map((c) => (c === eins ? "1" : "0")).join("");
        let s = "";
        for (let k = 0; k + 8 <= bits.length; k += 8) s += String.fromCharCode(parseInt(bits.slice(k, k + 8), 2));
        if (lesbar(s) && s.length > bester.length) bester = s;
      }
    }
    if (bester) out.push({ start: m.index, ende: m.index + seq.length, klartext: bester });
  }
  return out;
}

function lesbar(s: string): boolean {
  if (s.length < 2) return false;
  const ok = s.match(/[\p{L}\p{N}\s.,;:!?'"()\-äöüÄÖÜß]/gu)?.length ?? 0;
  return ok / s.length > 0.9;
}

/** Base64-Blöcke finden, die lesbaren Text enthalten */
export function findeBase64(roh: string): { start: number; ende: number; klartext: string }[] {
  const out: { start: number; ende: number; klartext: string }[] = [];
  const re = /(?<![A-Za-z0-9+/=])[A-Za-z0-9+/]{20,}={0,2}(?![A-Za-z0-9+/=])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(roh)) !== null) {
    const b = m[0];
    if (!/[A-Z]/.test(b) || !/[a-z]/.test(b) || !/\d|\+|\//.test(b)) continue;
    try {
      const bin = atob(b.length % 4 ? b + "=".repeat(4 - (b.length % 4)) : b);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      const s = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (lesbar(s)) out.push({ start: m.index, ende: m.index + b.length, klartext: s });
    } catch {
      // kein Text
    }
  }
  return out;
}

/** ROT13 — simpel, aber beliebt, um Filter zu umgehen */
export function rot13(s: string): string {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const b = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - b + 13) % 26) + b);
  });
}
