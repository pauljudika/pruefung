"use client";

import { useState } from "react";
import { UploadCloud, FileType, CheckCircle, ShieldCheck, ArrowRight } from "lucide-react";

export default function ImportPage() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const simulateProcessing = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsDone(true);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Import & Pseudonymisierung</h1>
        <p className="text-gray-500 mt-1">Exportieren Sie den Moodle-Testbericht (CSV) und laden Sie ihn hier hoch. Die Datei wird verschlüsselt an den Judika Tresor übertragen und dort serverseitig pseudonymisiert — erst danach sieht eine KI die Antworten.</p>
      </div>

      {!isDone ? (
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-6">
          <div className="border-b pb-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-800">1. CSV/Excel Datei hochladen</h2>
          </div>

          <div 
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4 transition-colors
              ${dragActive ? "border-uniblack bg-blue-50" : "border-gray-300 bg-gray-50"}
              ${file ? "border-green-400 bg-green-50" : ""}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <>
                <FileType size={48} className="text-green-500" />
                <div className="text-center">
                  <p className="font-semibold text-gray-800">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </>
            ) : (
              <>
                <UploadCloud size={48} className="text-uniblack" />
                <div className="text-center">
                  <p className="font-semibold text-gray-800">Datei hierher ziehen oder klicken</p>
                  <p className="text-sm text-gray-500">Moodle CSV-Format (.csv)</p>
                </div>
                <input type="file" className="hidden" accept=".csv" />
              </>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
            <ShieldCheck className="text-uniblack mt-0.5" size={20} />
            <div className="text-sm text-blue-900">
              <p className="font-semibold">Datenschutz-Garantie</p>
              <p className="mt-1">Der Judika Tresor entfernt Namen, E-Mail-Adressen und Matrikelnummern serverseitig in zwei Stufen: ein Regelwerk für feste Muster, danach ein lokal betriebenes Sprachmodell für Namen im Fließtext. Beides läuft auf eigenen Servern in der EU, ohne externe KI-Dienste. Nur pseudonymisierte Antworten (z. B. P-001) gehen in die Auswertung.</p>
            </div>
          </div>

          {file && !isProcessing && (
            <button 
              onClick={simulateProcessing}
              className="w-full bg-uniblack hover:bg-gray-900 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center gap-2"
            >
              Pseudonymisierung im Tresor starten
            </button>
          )}

          {isProcessing && (
            <div className="w-full bg-gray-100 py-3 rounded-lg flex justify-center items-center gap-2 font-medium text-gray-600">
              <span className="animate-spin h-5 w-5 border-2 border-uniblack border-t-transparent rounded-full"></span>
              Tresor pseudonymisiert die Daten…
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white p-8 rounded-xl border-green-200 border-2 shadow-sm space-y-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 text-green-600 p-4 rounded-full">
              <CheckCircle size={48} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Upload & Pseudonymisierung erfolgreich</h2>
          
          <div className="grid grid-cols-3 gap-4 text-left max-w-2xl mx-auto my-8">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="text-2xl font-bold text-gray-800">300</div>
              <div className="text-sm text-gray-500">Arbeiten erkannt</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="text-2xl font-bold text-gray-800">3</div>
              <div className="text-sm text-gray-500">Fragen pro Arbeit</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-500">Klarnamen an KI-Modelle</div>
            </div>
          </div>

          <div className="flex flex-col gap-3 max-w-sm mx-auto">
            <button className="w-full bg-gray-800 hover:bg-gray-900 text-white font-medium py-3 rounded-lg transition-colors">
              Zuordnungstabelle herunterladen (.csv)
            </button>
            <p className="text-xs text-gray-500">Die Zuordnung bleibt verschlüsselt im Tresor. Bei der Freigabe werden die Noten automatisch den Studierenden zugeordnet — die Tabelle dient nur als Sicherungskopie.</p>
            
            <button className="w-full mt-4 bg-uniblack hover:bg-gray-900 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center gap-2">
              Probelauf (KI) starten <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
