import Link from "next/link";
import { 
  LayoutDashboard, 
  FilePlus2, 
  Upload, 
  CheckSquare, 
  Settings 
} from "lucide-react";

export function Sidebar() {
  return (
    <div className="w-64 bg-uniblack text-white h-screen flex flex-col fixed left-0 top-0 border-r border-gray-800">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 bg-uniyellow"></div>
          <h1 className="text-xl font-bold tracking-tight">UNI GRAZ</h1>
        </div>
        <p className="text-xs text-gray-400">KI-Gestützte Vorbewertung</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        <Link href="/" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 hover:text-uniyellow transition-colors">
          <LayoutDashboard size={20} />
          <span className="font-medium">Dashboard</span>
        </Link>
        
        <Link href="/pruefungen/neu" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 hover:text-uniyellow transition-colors">
          <FilePlus2 size={20} />
          <span className="font-medium">Prüfung anlegen</span>
        </Link>
        
        <Link href="/import" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 hover:text-uniyellow transition-colors">
          <Upload size={20} />
          <span className="font-medium">Import & Pseudo</span>
        </Link>
        
        <Link href="/review" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 hover:text-uniyellow transition-colors">
          <CheckSquare size={20} />
          <span className="font-medium">Review & Freigabe</span>
        </Link>
      </nav>

      <div className="p-4 border-t border-gray-800">
        <Link href="/einstellungen" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 hover:text-uniyellow transition-colors">
          <Settings size={20} />
          <span className="font-medium">Einstellungen</span>
        </Link>
        <div className="mt-4 px-3 text-xs text-gray-400">
          Angemeldet als:<br/>
          <span className="font-semibold text-white">Prof. Dr. Storr</span>
        </div>
      </div>
    </div>
  );
}
