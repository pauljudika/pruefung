"use client";

import { useState } from "react";
import { Plus, Trash2, Save, ArrowRight } from "lucide-react";

export default function NeuePruefung() {
  const [fragen, setFragen] = useState([{ id: 1, punkte: 20 }]);

  const addFrage = () => {
    setFragen([...fragen, { id: fragen.length + 1, punkte: 0 }]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Neue Prüfung anlegen</h1>
          <p className="text-gray-500 mt-1">Definieren Sie Kopfdaten, Sachverhalt und das Prüfschema.</p>
        </div>
        <button className="bg-uniblue hover:bg-unibluedark text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium">
          <Save size={18} />
          Entwurf speichern
        </button>
      </div>

      {/* Kopfdaten */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">1. Kopfdaten der Prüfung</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Lehrveranstaltung</label>
            <input type="text" className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-uniblue outline-none" placeholder="z.B. Bürgerliches Recht I" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Semester</label>
            <input type="text" className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-uniblue outline-none" placeholder="z.B. WS 2026/27" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Prüfungstitel</label>
            <input type="text" className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-uniblue outline-none" placeholder="Fachprüfung Termin 1" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Datum der Prüfung</label>
            <input type="date" className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-uniblue outline-none" />
          </div>
        </div>
      </div>

      {/* Fragen */}
      <div className="space-y-6">
        {fragen.map((frage, index) => (
          <div key={frage.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-xl font-semibold text-gray-800">Frage {index + 1}</h2>
              {index > 0 && (
                <button className="text-red-500 hover:bg-red-50 p-2 rounded-md transition-colors" onClick={() => setFragen(fragen.filter(f => f.id !== frage.id))}>
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Angabe / Sachverhalt</label>
                <textarea rows={4} className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-uniblue outline-none resize-y" placeholder="Beschreiben Sie den Sachverhalt..."></textarea>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Fragestellung</label>
                <input type="text" className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-uniblue outline-none" placeholder="z.B. Hat A gegen B einen Anspruch auf Schadenersatz?" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Musterlösung & Lösungsweg</label>
                <textarea rows={6} className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-uniblue outline-none resize-y" placeholder="Herleitung, Normen, Subsumtion..."></textarea>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-unibluedark">Prüfpunkte (Schema)</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Max. Punkte:</span>
                    <input type="number" defaultValue={20} className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-right outline-none" />
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  Wie sollen die Prüfpunkte erstellt werden?
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-200 px-3 py-2 rounded-md hover:border-uniblue hover:bg-blue-50 transition-colors flex-1">
                    <input type="radio" name={`modus-${frage.id}`} className="text-uniblue" />
                    <span className="text-sm font-medium">Manuell anlegen</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-200 px-3 py-2 rounded-md hover:border-uniblue hover:bg-blue-50 transition-colors flex-1">
                    <input type="radio" name={`modus-${frage.id}`} className="text-uniblue" defaultChecked />
                    <span className="text-sm font-medium">KI-Vorschlag generieren</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-200 px-3 py-2 rounded-md hover:border-uniblue hover:bg-blue-50 transition-colors flex-1">
                    <input type="radio" name={`modus-${frage.id}`} className="text-uniblue" />
                    <span className="text-sm font-medium">Gemischt</span>
                  </label>
                </div>

                {/* Dummy Prüfpunkte Tabelle für Modus A/Ansicht */}
                <div className="mt-4 bg-white rounded border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200 text-left">
                      <tr>
                        <th className="px-3 py-2 font-medium text-gray-600">Prüfpunkt (Kriterium)</th>
                        <th className="px-3 py-2 font-medium text-gray-600 w-24">Punkte</th>
                        <th className="px-3 py-2 font-medium text-gray-600 w-20 text-center">Pflicht</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="px-3 py-2">
                          <input type="text" defaultValue="Anspruchsgrundlage § 1295 ABGB erkannt" className="w-full bg-transparent outline-none focus:border-b-2 border-uniblue" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" defaultValue={2} className="w-16 border border-gray-200 rounded px-1 py-1" />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox" defaultChecked className="rounded text-uniblue focus:ring-uniblue" />
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">
                          <input type="text" defaultValue="Schaden dargelegt" className="w-full bg-transparent outline-none focus:border-b-2 border-uniblue" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" defaultValue={2} className="w-16 border border-gray-200 rounded px-1 py-1" />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox" className="rounded text-uniblue focus:ring-uniblue" />
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-uniblue font-medium flex items-center gap-1 cursor-pointer hover:underline">
                          <Plus size={14} /> Weiteren Prüfpunkt hinzufügen
                        </td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={addFrage}
        className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-uniblue hover:text-uniblue hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Weitere Frage hinzufügen
      </button>
      
      <div className="pt-6 border-t border-gray-200 flex justify-end">
        <button className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors font-medium">
          Weiter zur Übersicht
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
