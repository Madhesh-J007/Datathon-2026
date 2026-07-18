/**
 * Role-rendered navigation sidebar (SAD Section 11) - hides, not just disables, unauthorized modules. Used by: app shell.
 */
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import {
  LayoutDashboard,
  FileText,
  Map,
  Flame,
  Network,
  Brain,
  FolderSync,
  FileBarChart,
  UserCog,
  Shield,
  LogOut,
} from "lucide-react";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const roleName = user?.role?.RoleName || "Guest";

  const menuItems = [
    { name: "Executive Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["Admin", "SCRB_Officer", "SHO", "Constable"] },
    { name: "Officer Workspace", path: "/workspace", icon: Shield, roles: ["Admin", "SCRB_Officer", "SHO", "Constable"] },
    { name: "Cases Registry", path: "/cases", icon: FileText, roles: ["Admin", "SCRB_Officer", "SHO", "Constable"] },
    { name: "GIS Crime Map", path: "/map", icon: Map, roles: ["Admin", "SCRB_Officer", "SHO", "Constable"] },
    { name: "Hotspots Analysis", path: "/hotspots", icon: Flame, roles: ["Admin", "SCRB_Officer", "SHO"] },
    { name: "Crime Network", path: "/network", icon: Network, roles: ["Admin", "SCRB_Officer", "SHO"] },
    { name: "Predictive Intel", path: "/predictive", icon: Brain, roles: ["Admin", "SCRB_Officer", "SHO"] },
    { name: "Collab Requests", path: "/collaboration", icon: FolderSync, roles: ["Admin", "SCRB_Officer", "SHO"] },
    { name: "Reports Center", path: "/reports", icon: FileBarChart, roles: ["Admin", "SCRB_Officer", "SHO"] },
    { name: "Admin Console", path: "/admin", icon: UserCog, roles: ["Admin"] },
  ];

  const allowedItems = menuItems.filter((item) => item.roles.includes(roleName));

  return (
    <aside className="w-64 bg-[#0d1322] border-r border-[#1e293b] flex flex-col h-screen select-none">
      <div className="p-5 border-b border-[#1e293b] flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-white tracking-wider">
          KSP
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-100 tracking-tight leading-tight">
            KSP Intelligence
          </h1>
          <span className="text-[10px] text-blue-500 font-mono tracking-widest uppercase">
            Command Center
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                isActive
                  ? "bg-blue-600/25 text-blue-400 border-l-2 border-blue-500 font-medium"
                  : "text-slate-400 hover:bg-[#151c2e] hover:text-slate-200"
              }`}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#1e293b] bg-[#0a0f1b]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
            {user?.Username?.substring(0, 2).toUpperCase() || "SI"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-200 truncate">{user?.Username}</p>
            <p className="text-[10px] text-slate-500 font-mono uppercase truncate">{roleName}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={12} />
          <span>System Log Out</span>
        </button>
      </div>
    </aside>
  );
}
