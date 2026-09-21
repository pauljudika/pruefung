"use client";

import { Shield, Users, Activity, Lock, Database, Fingerprint } from "lucide-react";

export default function EinstellungenPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Einstellungen & Administration</h1>
        <p className="text-gray-500 mt-2">Benutzerverwaltung, Rollenverteilung und manipulationssicheres Audit-Log.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Linke Spalte: User/Berechtigungen */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users size={20} className="text-gray-600" />
                <h2 className="font-semibold text-gray-800">Benutzer & Berechtigungen</h2>
              </div>
              <button className="text-sm bg-uniblack text-white px-3 py-1.5 rounded-md hover:bg-gray-800 transition-colors">
                + Neuer Benutzer
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 font-medium">Name & Rolle</th>
                    <th className="px-4 py-3 font-medium text-center">Prüfung anlegen</th>
                    <th className="px-4 py-3 font-medium text-center">Punkte anpassen</th>
                    <th className="px-4 py-3 font-medium text-center">Freigabe erteilen</th>
                    <th className="px-4 py-3 font-medium text-center">Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">Prof. Dr. Stefan Storr</div>
                      <div className="text-xs text-gray-500 mt-0.5">Institutsleitung / Freigeber</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Toggle active={true} disabled={true} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Toggle active={true} disabled={true} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Toggle active={true} disabled={true} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Toggle active={true} disabled={true} />
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50 transition-colors bg-yellow-50/30">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">Magdalena Eder</div>
                      <div className="text-xs text-gray-500 mt-0.5">Assistenz / Doktorandin</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Toggle active={true} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Toggle active={true} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Toggle active={false} />
                      <div className="text-[10px] text-red-500 mt-1">Gesperrt</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Toggle active={false} />
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">Studienassistenz (Sammel)</div>
                      <div className="text-xs text-gray-500 mt-0.5">Bearbeiter</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Toggle active={false} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Toggle active={false} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Toggle active={false} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Toggle active={false} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Rechte Spalte: Systemeinstellungen */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Database size={20} className="text-gray-600" />
              <h2 className="font-semibold text-gray-800">KI-Modell & Provider</h2>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Aktiver Endpunkt</label>
                <select className="mt-1 w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-uniyellow outline-none bg-white">
                  <option>UniGPT (Interne API)</option>
                  <option>Anthropic Claude (EU)</option>
                  <option>Google Vertex AI (Frankfurt)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Modell-Version</label>
                <select className="mt-1 w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-uniyellow outline-none bg-white">
                  <option>claude-3-5-sonnet-20240620 (Gepinnt)</option>
                  <option>claude-3-opus-20240229</option>
                </select>
              </div>
              <div className="pt-2">
                <div className="bg-green-50 text-green-700 text-xs p-2 rounded flex gap-2 items-start">
                  <Shield size={14} className="mt-0.5 flex-shrink-0" />
                  <span>AVV-Status: <strong>Geprüft</strong> (Kein Training mit Studierendendaten)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Audit-Log (Unten) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-gray-600" />
            <h2 className="font-semibold text-gray-800">System Audit-Log</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Lock size={14} /> Append-Only (Unveränderbar)
          </div>
        </div>
        
        <div className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
              <tr>
                <th className="px-6 py-3 font-medium">Zeitstempel</th>
                <th className="px-4 py-3 font-medium">Benutzer</th>
                <th className="px-4 py-3 font-medium">Aktion</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-6 py-3 font-medium text-right">Hash (Kette)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono text-xs">
              <tr className="hover:bg-gray-50 text-gray-600">
                <td className="px-6 py-3">2026-09-21 11:42:15</td>
                <td className="px-4 py-3">Prof. Dr. Storr</td>
                <td className="px-4 py-3"><span className="text-green-600 font-bold">FREIGABE</span></td>
                <td className="px-4 py-3">Freigabe für Prüfung 'Bürgerliches Recht I' (ID: PR-0926) erteilt.</td>
                <td className="px-6 py-3 text-right text-gray-400">0x8f2a...9c1b</td>
              </tr>
              <tr className="hover:bg-gray-50 text-gray-600">
                <td className="px-6 py-3">2026-09-21 11:38:22</td>
                <td className="px-4 py-3">Prof. Dr. Storr</td>
                <td className="px-4 py-3"><span className="text-yellow-600 font-bold">PUNKTE_AENDERUNG</span></td>
                <td className="px-4 py-3">Arbeit P-0142, Frage 1, Prüfpunkt 3: Wert von 0 auf 2 geändert. Kommentar: "Doch vertretbar".</td>
                <td className="px-6 py-3 text-right text-gray-400">0x3e11...4a9f</td>
              </tr>
              <tr className="hover:bg-gray-50 text-gray-600">
                <td className="px-6 py-3">2026-09-21 09:15:00</td>
                <td className="px-4 py-3">System (KI_Lauf)</td>
                <td className="px-4 py-3"><span className="text-blue-600 font-bold">BATCH_AUSWERTUNG</span></td>
                <td className="px-4 py-3">Batch-Lauf für 300 Arbeiten beendet. Modell: claude-3-5-sonnet. Flags: 12 Unsicher.</td>
                <td className="px-6 py-3 text-right text-gray-400">0x77b2...11ef</td>
              </tr>
              <tr className="hover:bg-gray-50 text-gray-600">
                <td className="px-6 py-3">2026-09-20 16:45:12</td>
                <td className="px-4 py-3">Magdalena Eder</td>
                <td className="px-4 py-3"><span className="text-purple-600 font-bold">IMPORT</span></td>
                <td className="px-4 py-3">CSV Upload: 300 Arbeiten geladen und lokal pseudonymisiert.</td>
                <td className="px-6 py-3 text-right text-gray-400">0x1a9c...8b22</td>
              </tr>
              <tr className="hover:bg-gray-50 text-gray-600">
                <td className="px-6 py-3">2026-09-20 14:10:05</td>
                <td className="px-4 py-3">Magdalena Eder</td>
                <td className="px-4 py-3"><span className="text-gray-800 font-bold">SCHEMA_ERSTELLT</span></td>
                <td className="px-4 py-3">Neues Bewertungsschema für 'Bürgerliches Recht I' angelegt. 3 Fragen.</td>
                <td className="px-6 py-3 text-right text-gray-400">0x9f55...cc10</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Kleiner Helper für den Toggle Switch
function Toggle({ active, disabled = false }: { active: boolean, disabled?: boolean }) {
  return (
    <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${active ? 'bg-uniyellow' : 'bg-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${active ? 'translate-x-4' : 'translate-x-1'}`} />
    </div>
  );
}
