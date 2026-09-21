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
    <div className="w-64 bg-uniblue text-white h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-unibluedark">
        <h1 className="text-xl font-bold">REWI Prüfungstool</h1>
        <p className="text-xs text-blue-200 mt-1">KI-Gestützte Vorbewertung</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        <Link href="/" className="flex items-center gap-3 p-3 rounded-lg hover:bg-unibluedark transition-colors">
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
        
        <Link href="/pruefungen/neu" className="flex items-center gap-3 p-3 rounded-lg hover:bg-unibluedark transition-colors">
          <FilePlus2 size={20} />
          <span>Prüfung anlegen</span>
        </Link>
        
        <Link href="/import" className="flex items-center gap-3 p-3 rounded-lg hover:bg-unibluedark transition-colors">
          <Upload size={20} />
          <span>Import & Pseudo</span>
        </Link>
        
        <Link href="/review" className="flex items-center gap-3 p-3 rounded-lg hover:bg-unibluedark transition-colors">
          <CheckSquare size={20} />
          <span>Review & Freigabe</span>
        </Link>
      </nav>

      <div className="p-4 border-t border-unibluedark">
        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-unibluedark transition-colors cursor-pointer">
          <Settings size={20} />
          <span>Einstellungen</span>
        </div>
        <div className="mt-4 px-3 text-xs text-blue-300">
          Angemeldet als:<br/>
          <span className="font-semibold text-white">Prof. Dr. Storr</span>
        </div>
      </div>
    </div>
  );
}
