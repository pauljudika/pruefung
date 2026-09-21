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
        {/* Neues Prüfungstool Logo */}
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
              <rect width="100" height="100" rx="24" fill="#000000" className="border border-gray-700"/>
              <line x1="25" y1="30" x2="60" y2="30" stroke="#333333" strokeWidth="6" strokeLinecap="round"/>
              <line x1="25" y1="45" x2="50" y2="45" stroke="#333333" strokeWidth="6" strokeLinecap="round"/>
              <path d="M25 65 L45 80 L80 40" stroke="#ffd500" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M75 15 L78 24 L87 27 L78 30 L75 39 L72 30 L63 27 L72 24 Z" fill="#ffffff"/>
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight tracking-wide">Prüfungstool</div>
            <div className="text-uniyellow text-[10px] font-semibold uppercase tracking-wider">AI Grading System</div>
          </div>
        </div>

        {/* Uni Graz CI Referenz */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-800/50">
          <div className="w-3 h-3 bg-uniyellow"></div>
          <h2 className="text-sm font-bold tracking-widest text-gray-400">UNI GRAZ</h2>
        </div>
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
