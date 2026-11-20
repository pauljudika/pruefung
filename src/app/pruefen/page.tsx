"use client";

import { Fragment, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ScanSearch, Upload, ShieldAlert, ShieldCheck, AlertTriangle, EyeOff, Code, Bot, ClipboardPaste,
  PenLine, FileWarning, FileText, Info, Lock, X,
} from "lucide-react";
import { pruefeText, KATEGORIE_INFO, ZEICHEN_NAMEN, type Fund, type Kategorie, type Modus, type Schwere } from "@/lib/integritaet/pruefe";
import { liesDocx } from "@/lib/integritaet/docx";
import { liesPdf } from "@/lib/integritaet/pdf";
import { herkunftAusHtml, fundAusHerkunft, type Herkunft } from "@/lib/integritaet/zwischenablage";
import { BEISPIELE } from "@/lib/integritaet/beispiele";

const KAT_STIL: Record<Kategorie, { icon: typeof Bot; mark: string; chip: string }> = {
  wasserzeichen: { icon: EyeOff, mark: "bg-purple-200 outline-purple-400", chip: "bg-purple-100 text-purple-800" },
  markup: { icon: Code, mark: "bg-sky-200 outline-sky-400", chip: "bg-sky-100 text-sky-800" },
  chatreste: { icon: Bot, mark: "bg-red-200 outline-red-400", chip: "bg-red-100 text-red-800" },
  paste: { icon: ClipboardPaste, mark: "bg-orange-200 outline-orange-400", chip: "bg-orange-100 text-orange-800" },
  stil: { icon: PenLine, mark: "bg-amber-100 outline-amber-300", chip: "bg-amber-100 text-amber-800" },
  injection: { icon: ShieldAlert, mark: "bg-rose-300 outline-rose-500", chip: "bg-rose-100 text-rose-800" },
  dokument: { icon: FileWarning, mark: "bg-teal-200 outline-teal-400", chip: "bg-teal-100 text-teal-800" },
};

const SCHWERE_STIL: Record<Schwere, { label: string; cls: string }> = {
  hoch: { label: "Starkes Indiz", cls: "bg-red-600 text-white" },
  mittel: { label: "Indiz", cls: "bg-yellow-400 text-black" },
  info: { label: "Hinweis", cls: "bg-gray-200 text-gray-700" },
};

const RANG: Record<Schwere, number> = { hoch: 3, mittel: 2, info: 1 };

// ───────── Darstellung des Textes mit Markierungen ─────────

function istTag(cp: number) {
  return cp >= 0xe0000 && cp <= 0xe007f;
}

function zeichenDarstellen(t: string, markiert: boolean): ReactNode[] {
  const out: ReactNode[] = [];
  const zeichen = Array.from(t);
  let puffer = "";
  const flush = () => {
    if (puffer) out.push(puffer);
    puffer = "";
  };
  for (let i = 0; i < zeichen.length; i++) {
    const c = zeichen[i];
    const cp = c.codePointAt(0)!;
    if (istTag(cp)) {
      flush();
      let klar = "";
      while (i < zeichen.length && istTag(zeichen[i].codePointAt(0)!)) {
        klar += String.fromCharCode(zeichen[i].codePointAt(0)! - 0xe0000);
        i++;
      }
      i--;
      out.push(
        <span key={out.length} title={`Unsichtbarer Text: ${klar}`} className="inline-flex items-center gap-1 mx-0.5 px-1.5 rounded bg-rose-600 text-white text-[11px] font-mono align-middle">
          <Lock size={10} /> versteckt: „{klar}“
        </span>,
      );
    } else if (ZEICHEN_NAMEN[c] && (markiert || c !== " ")) {
      flush();
      out.push(
        <span key={out.length} className="mx-px px-1 rounded bg-purple-700 text-white text-[10px] font-mono align-middle">
          {ZEICHEN_NAMEN[c]}
        </span>,
      );
    } else if (c === "\n" && markiert) {
      flush();
      out.push(<span key={out.length} className="text-orange-600 font-bold">↵{"\n"}</span>);
    } else {
      puffer += c;
    }
  }
  flush();
  return out;
}

function MarkierterText({ text, funde, fokus }: { text: string; funde: Fund[]; fokus: string | null }) {
  const segmente = useMemo(() => {
    const grenzen = new Set<number>([0, text.length]);
    for (const f of funde) for (const s of f.stellen) {
      grenzen.add(s.start);
      grenzen.add(s.ende);
    }
    const g = [...grenzen].filter((x) => x >= 0 && x <= text.length).sort((a, b) => a - b);
    const segs: { start: number; ende: number; fund?: Fund }[] = [];
    for (let i = 0; i < g.length - 1; i++) {
      const [a, b] = [g[i], g[i + 1]];
      let best: Fund | undefined;
      for (const f of funde) {
        if (fokus && f.id !== fokus) continue;
        if (f.stellen.some((s) => s.start <= a && s.ende >= b)) {
          if (!best || RANG[f.schwere] > RANG[best.schwere]) best = f;
        }
      }
      segs.push({ start: a, ende: b, fund: best });
    }
    return segs;
  }, [text, funde, fokus]);

  return (
    <div className="whitespace-pre-wrap leading-relaxed text-gray-800 text-[15px]">
      {segmente.map((s, i) => {
        const t = text.slice(s.start, s.ende);
        if (!s.fund) return <span key={i}>{zeichenDarstellen(t, false)}</span>;
        const st = KAT_STIL[s.fund.kategorie];
        return (
          <mark key={i} data-fund={s.fund.id} title={s.fund.titel} className={`${st.mark} rounded-sm outline-1 px-0.5 text-inherit ${fokus ? "outline-2" : ""}`}>
            {zeichenDarstellen(t, true)}
          </mark>
        );
      })}
    </div>
  );
}

// ───────── Seite ─────────

type Dokument = { datei: string; art: "Word" | "PDF"; funde: Fund[]; meta: [string, string][] };

function datum(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("de-AT", { dateStyle: "short", timeStyle: "short" });
}

export default function PruefenPage() {
  const [text, setText] = useState("");
  const [modus, setModus] = useState<Modus>("online");
  const [docx, setDocx] = useState<Dokument | null>(null);
  const [herkunft, setHerkunft] = useState<Herkunft | null>(null);
  const [ansicht, setAnsicht] = useState<"eingabe" | "markiert">("eingabe");
  const [fokus, setFokus] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const ergebnis = useMemo(() => {
    if (!text.trim()) return null;
    return pruefeText(text, { modus, zusatzFunde: [...(docx?.funde ?? []), ...fundAusHerkunft(herkunft)] });
  }, [text, modus, docx, herkunft]);

  function neu(t: string, m: Modus) {
    setText(t);
    setModus(m);
    setFokus(null);
    setFehler(null);
    setAnsicht(t.trim() ? "markiert" : "eingabe");
  }

  async function dateiLaden(f: File) {
    setHerkunft(null);
    setDocx(null);
    try {
      const name = f.name.toLowerCase();
      if (name.endsWith(".docx")) {
        const b = liesDocx(new Uint8Array(await f.arrayBuffer()));
        const m = b.meta;
        setDocx({
          datei: f.name,
          art: "Word",
          funde: b.funde,
          meta: [
            ["Programm", m.anwendung ?? "—"],
            ["Bearbeitungszeit", m.bearbeitungsMinuten !== undefined ? `${m.bearbeitungsMinuten} Min.` : "—"],
            ["Speichervorgänge", m.revision !== undefined ? String(m.revision) : "—"],
            ["Erstellt", datum(m.erstellt)],
            ["Geändert", datum(m.geaendert)],
            ["Autor", m.autorVorhanden ? "vorhanden (ausgeblendet)" : "—"],
          ],
        });
        neu(b.text, "word");
      } else if (name.endsWith(".pdf")) {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const b = await liesPdf(new Uint8Array(await f.arrayBuffer()), pdfjs as unknown as Parameters<typeof liesPdf>[1]);
        const m = b.meta;
        setDocx({
          datei: f.name,
          art: "PDF",
          funde: b.funde,
          meta: [
            ["Seiten", String(m.seiten)],
            ["Programm", m.programm ?? "—"],
            ["PDF-Erzeuger", m.erzeuger ?? "—"],
            ["Erstellt", datum(m.erstellt)],
            ["Geändert", datum(m.geaendert)],
            ["Autor", m.autorVorhanden ? "vorhanden (ausgeblendet)" : "—"],
          ],
        });
        if (!b.text.trim()) setFehler("Das PDF enthält keinen Text (vermutlich ein Scan ohne Texterkennung).");
        neu(b.text, "word");
      } else if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".csv") || f.type.startsWith("text/")) {
        neu(await f.text(), "online");
      } else if (name.endsWith(".doc")) {
        setFehler("Das alte .doc-Format wird nicht unterstützt. Bitte in Word als .docx speichern.");
      } else {
        setFehler(`Dateityp nicht unterstützt: ${f.name}`);
      }
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    }
  }

  function fokussiere(id: string) {
    const neuFokus = fokus === id ? null : id;
    setFokus(neuFokus);
    setAnsicht("markiert");
    if (neuFokus) {
      setTimeout(() => textRef.current?.querySelector(`[data-fund="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    }
  }

  const ampel = ergebnis?.ampel;
  const kategorienMitFund = ergebnis ? (Object.keys(KATEGORIE_INFO) as Kategorie[]).filter((k) => ergebnis.funde.some((f) => f.kategorie === k && f.schwere !== "info")) : [];

  return (
    <div className="max-w-[1400px]">
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ScanSearch size={30} /> Integritäts-Check
          </h1>
          <p className="text-gray-500 mt-1 max-w-3xl">
            Prüft Abgaben auf KI-Wasserzeichen, unsichtbare Zeichen, HTML- und Markdown-Reste, Chat-Formeln, Copy-Paste-Spuren aus Word, PDF und Web sowie typische Merkmale von KI-Texten.
          </p>
        </div>
        <span className="flex items-center gap-2 text-xs font-medium bg-green-50 text-green-800 border border-green-200 rounded-full px-3 py-1.5">
          <Lock size={12} /> Analyse läuft lokal — der Text verlässt diesen Rechner nicht
        </span>
      </div>

      {/* Steuerleiste */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mr-1">Beispiele</span>
          {BEISPIELE.map((b) => (
            <button
              key={b.id}
              title={b.beschreibung}
              onClick={() => {
                setDocx(null);
                setHerkunft(null);
                neu(b.text, b.modus);
              }}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:border-uniblack hover:bg-gray-50"
            >
              {b.titel}
            </button>
          ))}
        </div>
        <div className="w-px h-8 bg-gray-200 hidden md:block" />
        <label className="text-sm px-3 py-1.5 rounded-lg bg-uniblack text-white hover:bg-gray-800 cursor-pointer flex items-center gap-2">
          <Upload size={16} /> Datei prüfen (.docx, .pdf, .txt)
          <input type="file" accept=".docx,.txt,.md,.csv,.pdf,.doc" className="hidden" onChange={(e) => e.target.files?.[0] && dateiLaden(e.target.files[0])} />
        </label>
        <span className="text-xs text-gray-500">
          Beispiel-Abgaben:{" "}
          <a href="/beispiele/abgabe-beispiel.docx" download className="underline hover:text-uniblack">Word</a>
          {" · "}
          <a href="/beispiele/abgabe-beispiel.pdf" download className="underline hover:text-uniblack">PDF</a>
        </span>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-gray-500">Herkunft des Textes:</span>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {(["online", "word"] as Modus[]).map((m) => (
              <button key={m} onClick={() => setModus(m)} className={`px-3 py-1.5 ${modus === m ? "bg-uniyellow font-semibold" : "bg-white hover:bg-gray-50"}`}>
                {m === "online" ? "Online-Formular (Moodle)" : "Word-Dokument"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {fehler && (
        <div className="mb-6 p-3 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-900 text-sm flex gap-2 items-start">
          <Info size={18} className="flex-shrink-0 mt-0.5" /> {fehler}
          <button className="ml-auto" onClick={() => setFehler(null)}><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_440px] gap-6">
        {/* Text */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-[520px]">
          <div className="flex border-b border-gray-200 bg-gray-50 rounded-t-xl items-center">
            {(["eingabe", "markiert"] as const).map((a) => (
              <button
                key={a}
                disabled={a === "markiert" && !ergebnis}
                onClick={() => setAnsicht(a)}
                className={`px-4 py-3 text-sm font-medium ${ansicht === a ? "border-b-2 border-uniyellow bg-white text-uniblack" : "text-gray-500 hover:text-gray-700 disabled:opacity-40"}`}
              >
                {a === "eingabe" ? "Text eingeben / einfügen" : "Markierte Stellen"}
              </button>
            ))}
            {docx && (
              <span className="ml-auto mr-4 text-xs text-gray-500 flex items-center gap-1">
                <FileText size={14} /> {docx.datei}
              </span>
            )}
            {fokus && ansicht === "markiert" && (
              <button onClick={() => setFokus(null)} className={`${docx ? "" : "ml-auto"} mr-4 text-xs flex items-center gap-1 px-2 py-1 rounded bg-gray-200 hover:bg-gray-300`}>
                Filter aufheben <X size={12} />
              </button>
            )}
          </div>
          {ansicht === "eingabe" ? (
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (docx) setDocx(null); // Positionen der Datei stimmen nach Bearbeitung nicht mehr
              }}
              onPaste={(e) => {
                setHerkunft(herkunftAusHtml(e.clipboardData.getData("text/html")));
                setDocx(null);
                setTimeout(() => setAnsicht("markiert"), 0);
              }}
              placeholder="Antworttext hier einfügen (Strg/Cmd + V) — oder oben ein Beispiel bzw. eine Word-Datei laden."
              className="flex-1 p-6 font-mono text-sm resize-none outline-none rounded-b-xl"
            />
          ) : (
            <div ref={textRef} className="p-6 overflow-y-auto max-h-[70vh]">
              {ergebnis && <MarkierterText text={text} funde={ergebnis.funde} fokus={fokus} />}
            </div>
          )}
          {ergebnis && (
            <div className="border-t border-gray-100 px-6 py-2 text-xs text-gray-500 flex gap-4">
              <span>{ergebnis.statistik.woerter} Wörter</span>
              <span>{ergebnis.statistik.saetze} Sätze</span>
              <span>{ergebnis.statistik.absaetze} Absätze</span>
              <span>{ergebnis.statistik.zeichen} Zeichen</span>
            </div>
          )}
        </div>

        {/* Ergebnis */}
        <div className="space-y-4">
          {!ergebnis ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
              <ScanSearch className="mx-auto mb-3 text-gray-300" size={40} />
              Noch kein Text. Fügen Sie eine Antwort ein oder laden Sie ein Beispiel.
            </div>
          ) : (
            <>
              <div
                className={`rounded-xl p-5 border-2 ${
                  ampel === "rot" ? "bg-red-50 border-red-300" : ampel === "gelb" ? "bg-yellow-50 border-yellow-300" : "bg-green-50 border-green-300"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1.5 bg-uniblack p-2 rounded-lg">
                    {(["rot", "gelb", "gruen"] as const).map((f) => (
                      <div
                        key={f}
                        className={`w-4 h-4 rounded-full ${
                          ampel === f ? (f === "rot" ? "bg-red-500 shadow-[0_0_8px_#ef4444]" : f === "gelb" ? "bg-yellow-400 shadow-[0_0_8px_#facc15]" : "bg-green-500 shadow-[0_0_8px_#22c55e]") : "bg-gray-700"
                        }`}
                      />
                    ))}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      {ampel === "rot" ? <ShieldAlert className="text-red-600" size={20} /> : ampel === "gelb" ? <AlertTriangle className="text-yellow-600" size={20} /> : <ShieldCheck className="text-green-600" size={20} />}
                      {ampel === "rot" ? "Deutliche Hinweise" : ampel === "gelb" ? "Einzelne Auffälligkeiten" : "Keine Auffälligkeiten"}
                    </h2>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {ampel === "rot"
                        ? "Bitte die markierten Stellen vor der Bewertung manuell prüfen."
                        : ampel === "gelb"
                          ? "Einzelne Merkmale — für sich genommen kein Nachweis."
                          : "Keine technischen Spuren gefunden. Das schließt eine KI-Nutzung nicht aus."}
                    </p>
                  </div>
                </div>
                {kategorienMitFund.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {kategorienMitFund.map((k) => {
                      const Icon = KAT_STIL[k].icon;
                      return (
                        <span key={k} className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${KAT_STIL[k].chip}`}>
                          <Icon size={12} /> {KATEGORIE_INFO[k].kurz}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {herkunft && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
                  <div className="font-semibold flex items-center gap-2"><ClipboardPaste size={16} /> Zwischenablage: {herkunft.quelle}</div>
                  <div className="text-gray-500 text-xs mt-1">{herkunft.hinweise.join(" · ")}</div>
                </div>
              )}

              {docx && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
                  <div className="font-semibold flex items-center gap-2 mb-2"><FileText size={16} /> {docx.art}-Metadaten</div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                    {docx.meta.map(([k, v]) => (
                      <Fragment key={k}>
                        <dt className="text-gray-500">{k}</dt>
                        <dd className="break-words">{v}</dd>
                      </Fragment>
                    ))}
                  </dl>
                </div>
              )}

              <div className="space-y-2">
                {ergebnis.funde.length === 0 && <p className="text-sm text-gray-500 px-1">Keine Funde.</p>}
                {ergebnis.funde.map((f) => {
                  const st = KAT_STIL[f.kategorie];
                  const Icon = st.icon;
                  const aktiv = fokus === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => f.stellen.length && fokussiere(f.id)}
                      className={`w-full text-left bg-white rounded-lg border p-3 transition-shadow ${aktiv ? "border-uniblack shadow-md" : "border-gray-200 hover:shadow-sm"} ${f.stellen.length ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`p-1.5 rounded ${st.chip}`}><Icon size={16} /></span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between gap-2 items-start">
                            <h3 className="font-semibold text-sm text-gray-900">{f.titel}</h3>
                            <span className={`text-[10px] font-bold uppercase whitespace-nowrap px-1.5 py-0.5 rounded ${SCHWERE_STIL[f.schwere].cls}`}>{SCHWERE_STIL[f.schwere].label}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{f.detail}</p>
                          {f.belege && f.belege.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {f.belege.map((b, i) => (
                                <li key={i} className="text-[11px] font-mono bg-gray-50 border border-gray-100 rounded px-2 py-1 text-gray-700 break-words">{b}</li>
                              ))}
                            </ul>
                          )}
                          {f.stellen.length > 0 && <div className="text-[11px] text-gray-400 mt-1.5">{aktiv ? "Nur diese Stellen markiert — erneut klicken für alle" : `${f.stellen.length} Stelle${f.stellen.length > 1 ? "n" : ""} im Text anzeigen →`}</div>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed px-1">
                Der Check zeigt Indizien für eine menschliche Prüfung, keinen Beweis. Statistische Wasserzeichen einzelner Anbieter (etwa Googles SynthID) sind nur mit deren eigenem Schlüssel nachweisbar. Geprüft werden die Spuren, die beim Kopieren und durch KI-Ausgaben tatsächlich im Text landen.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
