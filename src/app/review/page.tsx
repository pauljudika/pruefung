"use client";

import { useState } from "react";
import { Check, X, AlertTriangle, MessageSquare, ChevronLeft, ChevronRight, Save } from "lucide-react";

export default function ReviewPage() {
  const [activeTab, setActiveTab] = useState(1);
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
          <p className="text-gray-500 mt-1">Prüfung: Bürgerliches Recht I — Arbeit: <span className="font-mono font-bold text-gray-700">P-0142</span></p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 border border-gray-300 rounded hover:bg-gray-50"><ChevronLeft size={20}/></button>
          <span className="text-sm font-medium">142 / 300</span>
          <button className="p-2 border border-gray-300 rounded hover:bg-gray-50"><ChevronRight size={20}/></button>
          <div className="w-px h-6 bg-gray-300 mx-2"></div>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium">
            <Check size={18} />
            Arbeit freigeben
          </button>
        </div>
      </div>

      <div className="flex gap-6 h-full overflow-hidden">
        {/* Left column: Answer text */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button className={`px-4 py-3 font-medium text-sm ${activeTab === 1 ? 'border-b-2 border-uniblack text-uniblack' : 'text-gray-500'}`} onClick={() => setActiveTab(1)}>Frage 1 (Schadenersatz)</button>
            <button className={`px-4 py-3 font-medium text-sm ${activeTab === 2 ? 'border-b-2 border-uniblack text-uniblack' : 'text-gray-500'}`} onClick={() => setActiveTab(2)}>Frage 2 (Gewährleistung)</button>
            <button className={`px-4 py-3 font-medium text-sm ${activeTab === 3 ? 'border-b-2 border-uniblack text-uniblack' : 'text-gray-500'}`} onClick={() => setActiveTab(3)}>Frage 3 (Bereicherung)</button>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto leading-relaxed text-gray-800" dangerouslySetInnerHTML={{ __html: mockAnswer }}>
          </div>
        </div>

        {/* Right column: Grading criteria */}
        <div className="w-96 flex flex-col bg-gray-50 rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-shrink-0">
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
