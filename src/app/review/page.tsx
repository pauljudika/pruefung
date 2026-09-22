"use client";

import { useState } from "react";
import { Check, X, AlertTriangle, MessageSquare, ChevronLeft, ChevronRight, ShieldAlert, Fingerprint, Code, Bot } from "lucide-react";

export default function ReviewPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [punkte, setPunkte] = useState({
    p1: 2, p2: 1, p3: 0, p4: 4, p5: 2
  });

  // Mock data for the review
  const mockAnswer = `Der Anspruch auf Schadenersatz könnte sich aus § 1295 Abs 1 ABGB ergeben. 
Dafür müsste A durch B einen Schaden erlitten haben, B müsste diesen kausal verursacht haben und es müsste Rechtswidrigkeit sowie Verschulden vorliegen.

<mark class="bg-green-100 px-1 rounded border border-green-200">A hat die Vase des B umgestoßen, als er unachtsam durch den Raum rannte. Die Vase ist dabei zerbrochen, es ist also ein Schaden in Höhe des Wertes der Vase eingetreten.</mark> 
<mark class="bg-green-100 px-1 rounded border border-green-200">Das Verhalten des A war auch kausal (conditio sine qua non) für den Schaden.</mark> 

<mark class="bg-yellow-100 px-1 rounded border border-yellow-200">Bezüglich der Rechtswidrigkeit ist festzustellen, dass A gegen absolute Rechte (Eigentum) verstoßen hat. Ein Rechtfertigungsgrund ist nicht ersichtlich.</mark> 

<mark class="bg-red-100 px-1 rounded border border-red-200">Hinsichtlich des Verschuldens ist fraglich, ob A vorsätzlich gehandelt hat. Da er nur rannte, liegt wohl keine Absicht vor. Somit scheidet Verschulden aus und es besteht kein Anspruch.</mark>`;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Review & Freigabe</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-500">Prüfung: Bürgerliches Recht I — Arbeit: <span className="font-mono font-bold text-gray-700">P-0142</span></p>
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold flex items-center gap-1">
              <ShieldAlert size={12} /> BETRUGSVERDACHT
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 border border-gray-300 rounded hover:bg-gray-50"><ChevronLeft size={20}/></button>
          <span className="text-sm font-medium">142 / 300</span>
          <button className="p-2 border border-gray-300 rounded hover:bg-gray-50"><ChevronRight size={20}/></button>
          <div className="w-px h-6 bg-gray-300 mx-2"></div>
          <button className="bg-gray-300 text-gray-500 cursor-not-allowed px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
            <Check size={18} />
            Arbeit freigeben
          </button>
        </div>
      </div>

      <div className="flex gap-6 h-full overflow-hidden">
        {/* Left column: Content */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button className={`px-4 py-3 font-medium text-sm flex items-center gap-2 ${activeTab === 0 ? 'border-b-2 border-uniyellow text-uniblack bg-white' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab(0)}>
              <ShieldAlert size={16} className={activeTab === 0 ? 'text-red-500' : 'text-gray-400'} />
              Sicherheits-Analyse
            </button>
            <button className={`px-4 py-3 font-medium text-sm ${activeTab === 1 ? 'border-b-2 border-uniyellow text-uniblack bg-white' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab(1)}>Frage 1</button>
            <button className={`px-4 py-3 font-medium text-sm ${activeTab === 2 ? 'border-b-2 border-uniyellow text-uniblack bg-white' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab(2)}>Frage 2</button>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto">
            {activeTab === 0 ? (
              <div className="max-w-2xl mx-auto mt-4 space-y-6">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
                    <AlertTriangle size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Auffälligkeiten erkannt</h2>
                  <p className="text-gray-500 mt-2">Das System hat vor der Korrektur den Text auf Täuschungsversuche geprüft. Bitte sehen Sie sich die rot markierten Bereiche genauer an, bevor Sie bewerten.</p>
                </div>

                <div className="space-y-4">
                  {/* KI Score */}
                  <div className="p-4 border-2 border-red-200 bg-red-50 rounded-lg flex items-start gap-4">
                    <Bot className="text-red-600 mt-1" size={24} />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-bold text-red-900">KI-Text Wahrscheinlichkeit</h3>
                        <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">85%</span>
                      </div>
                      <p className="text-sm text-red-800">Die Perplexität und Struktur dieses Textes deuten stark auf die Verwendung eines Large Language Models (z.B. ChatGPT oder Claude) hin. Hohe Vorhersehbarkeit der Sätze.</p>
                    </div>
                  </div>

                  {/* Prompt Injection */}
                  <div className="p-4 border border-green-200 bg-green-50 rounded-lg flex items-start gap-4">
                    <Code className="text-green-600 mt-1" size={24} />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-bold text-green-900">Prompt Injections</h3>
                        <span className="text-green-700 text-sm font-bold flex items-center gap-1"><Check size={16}/> Unauffällig</span>
                      </div>
                      <p className="text-sm text-green-800">Keine versteckten Befehle an die Korrektur-KI im Text gefunden.</p>
                    </div>
                  </div>

                  {/* Formatierung / Copy Paste */}
                  <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg flex items-start gap-4">
                    <Fingerprint className="text-yellow-600 mt-1" size={24} />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-bold text-yellow-900">Formatierung & Paste-Check</h3>
                        <span className="text-yellow-700 text-sm font-bold flex items-center gap-1"><AlertTriangle size={16}/> Warnung</span>
                      </div>
                      <p className="text-sm text-yellow-800">Verdächtiges Einfüge-Verhalten. Der Text enthält Formatierungs-Fragmente (HTML-Tags), die typischerweise beim Kopieren aus externen Webseiten entstehen.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200 flex justify-center">
                  <button className="bg-uniblack text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800" onClick={() => setActiveTab(1)}>
                    Trotzdem zur Bewertung (Frage 1)
                  </button>
                </div>
              </div>
            ) : (
              <div className="leading-relaxed text-gray-800" dangerouslySetInnerHTML={{ __html: mockAnswer }}></div>
            )}
          </div>
        </div>

        {/* Right column: Grading criteria (only show if active tab > 0) */}
        <div className={`w-96 flex flex-col bg-gray-50 rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-shrink-0 transition-opacity ${activeTab === 0 ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">Punktevergabe F1</h2>
            <div className="text-xl font-bold text-uniblack">{Object.values(punkte).reduce((a,b)=>a+b,0)} <span className="text-sm text-gray-500 font-normal">/ 18 Pkt</span></div>
          </div>

          <div className="p-0 overflow-y-auto flex-1 divide-y divide-gray-200">
            
            {/* Criterion 1 */}
            <div className="p-4 bg-white hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900 text-sm">1. Anspruchsgrundlage §1295 erkannt</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  <Check size={12}/> Erfüllt
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3 border-l-2 border-green-400 pl-2">KI-Begründung: Die Norm wurde im Einleitungssatz korrekt genannt.</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs text-gray-500">Punkte:</span>
                <select className="border border-gray-300 rounded px-2 py-1 text-sm bg-white" value={punkte.p1} onChange={(e)=>setPunkte({...punkte, p1: Number(e.target.value)})}>
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>
            </div>

            {/* Criterion 2 */}
            <div className="p-4 bg-white hover:bg-gray-50 transition-colors border-l-4 border-l-yellow-400">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900 text-sm">2. Rechtswidrigkeit geprüft</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                  Teilweise
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3 border-l-2 border-yellow-400 pl-2">KI-Begründung: Schutzgesetzverletzung (absolutes Recht) wurde genannt, aber nicht näher am Sachverhalt subsumiert.</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs text-gray-500">Punkte:</span>
                <select className="border border-gray-300 rounded px-2 py-1 text-sm bg-white font-bold text-yellow-700" value={punkte.p2} onChange={(e)=>setPunkte({...punkte, p2: Number(e.target.value)})}>
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
            </div>

            {/* Criterion 3 */}
            <div className="p-4 bg-white hover:bg-gray-50 transition-colors border-l-4 border-l-red-500">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900 text-sm">3. Verschulden (Fahrlässigkeit)</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                  <X size={12}/> Nicht erfüllt
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3 border-l-2 border-red-500 pl-2">KI-Begründung: Studierende(r) verneint fälschlicherweise das Verschulden, da nur nach Vorsatz, nicht aber nach leichter Fahrlässigkeit gefragt wird.</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs text-gray-500">Punkte:</span>
                <select className="border border-gray-300 rounded px-2 py-1 text-sm bg-white" value={punkte.p3} onChange={(e)=>setPunkte({...punkte, p3: Number(e.target.value)})}>
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>
              
              <div className="mt-3 flex gap-2">
                <input type="text" placeholder="Kommentar zur Punkteänderung..." className="flex-1 text-xs border border-gray-300 rounded px-2 py-1" />
                <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-1 rounded"><MessageSquare size={14}/></button>
              </div>
            </div>

            {/* Flag Warning */}
            <div className="p-4 bg-orange-50 border-t border-orange-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-orange-500 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-sm font-medium text-orange-800">KI-Unsicherheit gemeldet</h4>
                  <p className="text-xs text-orange-700 mt-1">Modell ist sich bei der Argumentation zum Verschulden unsicher, da ein vertretbarer alternativer Lösungsweg angedeutet wird. Bitte manuell prüfen!</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
