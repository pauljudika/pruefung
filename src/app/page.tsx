import Link from "next/link";
import { FilePlus2, Upload, PlayCircle, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-2">Willkommen beim Pilotprojekt für die KI-gestützte Vorbewertung am REWI.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/pruefungen/neu" className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center gap-3">
          <div className="p-3 bg-blue-50 text-uniblack rounded-full">
            <FilePlus2 size={24} />
          </div>
          <h2 className="font-semibold text-gray-800">Prüfung anlegen</h2>
          <p className="text-sm text-gray-500">Neues Bewertungsschema erstellen</p>
        </Link>

        <Link href="/import" className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-full">
            <Upload size={24} />
          </div>
          <h2 className="font-semibold text-gray-800">CSV Import</h2>
          <p className="text-sm text-gray-500">Antworten laden & pseudonymisieren</p>
        </Link>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center gap-3 opacity-60">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-full">
            <PlayCircle size={24} />
          </div>
          <h2 className="font-semibold text-gray-800">KI-Auswertung</h2>
          <p className="text-sm text-gray-500">Batch-Lauf (Im Backend)</p>
        </div>

        <Link href="/review" className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center gap-3">
          <div className="p-3 bg-green-50 text-green-600 rounded-full">
            <CheckCircle2 size={24} />
          </div>
          <h2 className="font-semibold text-gray-800">Review</h2>
          <p className="text-sm text-gray-500">Vorbewertung prüfen & freigeben</p>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-800">Aktuelle Prüfungen</h2>
        </div>
        <div className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
              <tr>
                <th className="px-6 py-3 font-medium">LV / Titel</th>
                <th className="px-6 py-3 font-medium">Datum</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Arbeiten</th>
                <th className="px-6 py-3 text-right font-medium">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">Bürgerliches Recht I</div>
                  <div className="text-gray-500">SS 2026</div>
                </td>
                <td className="px-6 py-4 text-gray-600">15.09.2026</td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">In Review (12/300 geprüft)</span>
                </td>
                <td className="px-6 py-4 text-gray-600">300</td>
                <td className="px-6 py-4 text-right">
                  <Link href="/review" className="text-uniblack hover:underline font-medium">Weiter prüfen</Link>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">Privatrechtliche Grundlagen</div>
                  <div className="text-gray-500">WS 2025/26</div>
                </td>
                <td className="px-6 py-4 text-gray-600">22.01.2026</td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Freigegeben</span>
                </td>
                <td className="px-6 py-4 text-gray-600">142</td>
                <td className="px-6 py-4 text-right">
                  <span className="text-gray-400 cursor-not-allowed">Exportiert</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
