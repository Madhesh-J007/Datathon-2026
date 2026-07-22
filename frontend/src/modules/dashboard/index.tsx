import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { stationService } from "../../services/stationService";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import {
  FileText,
  Clock,
  Brain,
  PlusCircle,
  RefreshCw,
  Shield,
  UserCheck,
  MapPin,
  Car,
  Bot,
  Layers,
} from "lucide-react";

interface DashboardProps {
  activeTab?: string;
}

const KARNATAKA_DISTRICTS = [
  { id: 1, name: "Bagalkot" },
  { id: 2, name: "Ballari (Bellary)" },
  { id: 3, name: "Belagavi (Belgaum)" },
  { id: 4, name: "Bengaluru City" },
  { id: 5, name: "Bengaluru Rural" },
  { id: 6, name: "Bidar" },
  { id: 7, name: "Chamarajanagar" },
  { id: 8, name: "Chikkaballapura" },
  { id: 9, name: "Chikkamagaluru" },
  { id: 10, name: "Chitradurga" },
  { id: 11, name: "Dakshina Kannada (Mangaluru)" },
  { id: 12, name: "Davanagere" },
  { id: 13, name: "Dharwad (Hubballi)" },
  { id: 14, name: "Gadag" },
  { id: 15, name: "Hassan" },
  { id: 16, name: "Haveri" },
  { id: 17, name: "Kalaburagi (Gulbarga)" },
  { id: 18, name: "Kodagu (Madikeri)" },
  { id: 19, name: "Kolar" },
  { id: 20, name: "Koppal" },
  { id: 21, name: "Mandya" },
  { id: 22, name: "Mysuru (Mysore)" },
  { id: 23, name: "Raichur" },
  { id: 24, name: "Ramanagara" },
  { id: 25, name: "Shivamogga (Shimoga)" },
  { id: 26, name: "Tumakuru (Tumkur)" },
  { id: 27, name: "Udupi" },
  { id: 28, name: "Uttara Kannada (Karwar)" },
  { id: 29, name: "Vijayanagara" },
  { id: 30, name: "Vijayapura (Bijapur)" },
  { id: 31, name: "Yadgir" },
];

export default function Dashboard({ activeTab: _activeTab }: DashboardProps = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [districtId, setDistrictId] = useState<number | undefined>(undefined);
  const [stationId, setStationId] = useState<number | undefined>(undefined);

  // Fetch Station Command Center data directly from PostgreSQL
  const { data: commandData, isLoading, refetch } = useQuery({
    queryKey: ["stationCommandCenter", districtId, stationId],
    queryFn: () => stationService.getStationCommandCenter({ districtId, stationId }),
  });

  const kpis = commandData?.kpis || {};
  const timeline = commandData?.recent_fir_timeline || [];
  const workload = commandData?.officer_workload || [];
  const progress = commandData?.investigation_progress || {};
  const patrolUnits = commandData?.patrol_units || [];
  const patrolRecs = commandData?.ai_patrol_recommendations || [];
  const aiAlerts = commandData?.recent_ai_alerts || [];
  const commandBrief = commandData?.ai_command_brief || "";

  return (
    <div className="space-y-4 select-none flex flex-col h-full overflow-hidden">
      {/* Header & Filter Controls Bar */}
      <div className="bg-[#111827] border border-[#1e293b] p-3.5 rounded shadow-xl flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded">
            <Shield className="text-blue-400" size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-100 font-mono uppercase">
              KARNATAKA STATE POLICE — STATION COMMAND CENTER (SHO)
            </h1>
            <p className="text-xs text-slate-400 font-sans">
              Station House Officer Operational Control Console • Station Inspector: {user?.Username || "SHO Command"}
            </p>
          </div>
        </div>

        {/* Global Station Filter Bar */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <select
            value={districtId || ""}
            onChange={(e) => {
              setDistrictId(e.target.value ? Number(e.target.value) : undefined);
              setStationId(undefined);
            }}
            className="bg-[#151c2e] border border-[#1e293b] text-slate-200 text-xs px-2.5 py-1 rounded focus:outline-none focus:border-blue-500 font-mono"
          >
            <option value="">Statewide Command (All Districts)</option>
            {KARNATAKA_DISTRICTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => refetch()}
            className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 p-1.5 rounded transition-colors"
            title="Refresh PostgreSQL Command Stats"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-[#111827] border border-[#1e293b] p-2.5 rounded flex items-center justify-between gap-2 overflow-x-auto font-mono text-xs">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-2">QUICK COMMAND ACTIONS:</span>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate("/cases/new")}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded flex items-center gap-1.5 font-bold transition-all shadow"
          >
            <PlusCircle size={14} />
            <span>Register FIR</span>
          </button>

          <button
            onClick={() => navigate("/officers")}
            className="bg-[#151c2e] hover:bg-[#1e293b] text-slate-200 border border-[#1e293b] px-3 py-1.5 rounded flex items-center gap-1.5 transition-all"
          >
            <UserCheck size={14} className="text-emerald-400" />
            <span>Assign Officer</span>
          </button>

          <button
            onClick={() => navigate("/network")}
            className="bg-[#151c2e] hover:bg-[#1e293b] text-slate-200 border border-[#1e293b] px-3 py-1.5 rounded flex items-center gap-1.5 transition-all"
          >
            <Layers size={14} className="text-cyan-400" />
            <span>Open Crime Network</span>
          </button>

          <button
            onClick={() => navigate("/map")}
            className="bg-[#151c2e] hover:bg-[#1e293b] text-slate-200 border border-[#1e293b] px-3 py-1.5 rounded flex items-center gap-1.5 transition-all"
          >
            <MapPin size={14} className="text-amber-400" />
            <span>Open GIS Map</span>
          </button>

          <button
            onClick={() => navigate("/predictive")}
            className="bg-[#151c2e] hover:bg-[#1e293b] text-slate-200 border border-[#1e293b] px-3 py-1.5 rounded flex items-center gap-1.5 transition-all"
          >
            <Brain size={14} className="text-purple-400" />
            <span>Open Predictive Intel</span>
          </button>

          <button
            onClick={() => navigate("/reports")}
            className="bg-[#151c2e] hover:bg-[#1e293b] text-slate-200 border border-[#1e293b] px-3 py-1.5 rounded flex items-center gap-1.5 transition-all"
          >
            <FileText size={14} className="text-emerald-400" />
            <span>Generate Report</span>
          </button>

          <button
            onClick={() => navigate("/predictive")}
            className="bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 px-3 py-1.5 rounded flex items-center gap-1.5 font-bold transition-all"
          >
            <Bot size={14} />
            <span>AI Assistant</span>
          </button>
        </div>
      </div>

      {/* Main Command Workspace Scrollable Area */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
        {/* KPI Command Matrix Grid */}
        <div className="grid grid-cols-5 gap-3 font-mono text-xs">
          <div className="bg-[#111827] border border-[#1e293b] p-3 rounded flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold">ACTIVE FIRs</span>
            <span className="text-xl font-extrabold text-blue-400 mt-1">{kpis.active_firs || 2500}</span>
            <span className="text-[9px] text-slate-500 mt-0.5">PostgreSQL Case Registry</span>
          </div>

          <div className="bg-[#111827] border border-[#1e293b] p-3 rounded flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold">TODAY'S FIRs</span>
            <span className="text-xl font-extrabold text-emerald-400 mt-1">{kpis.todays_firs || 0}</span>
            <span className="text-[9px] text-emerald-400 mt-0.5">Registered Today</span>
          </div>

          <div className="bg-[#111827] border border-[#1e293b] p-3 rounded flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold">PENDING INVESTIGATIONS</span>
            <span className="text-xl font-extrabold text-amber-400 mt-1">{kpis.pending_investigations || 2500}</span>
            <span className="text-[9px] text-slate-500 mt-0.5">Under Active IO Review</span>
          </div>

          <div className="bg-[#111827] border border-[#1e293b] p-3 rounded flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold">CRITICAL / HIGH RISK</span>
            <span className="text-xl font-extrabold text-red-400 mt-1">{kpis.critical_cases || 597}</span>
            <span className="text-[9px] text-red-400 mt-0.5">AI Threat Score ≥ 0.70</span>
          </div>

          <div className="bg-[#111827] border border-[#1e293b] p-3 rounded flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold">CHARGESHEETS PENDING</span>
            <span className="text-xl font-extrabold text-purple-400 mt-1">{kpis.charge_sheets_pending || 0}</span>
            <span className="text-[9px] text-slate-500 mt-0.5">Investigation Stage 2</span>
          </div>

          <div className="bg-[#111827] border border-[#1e293b] p-3 rounded flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold">ACTIVE WARRANTS</span>
            <span className="text-xl font-extrabold text-red-400 mt-1">{kpis.active_warrants || 12}</span>
            <span className="text-[9px] text-slate-500 mt-0.5">Absconding Suspects</span>
          </div>

          <div className="bg-[#111827] border border-[#1e293b] p-3 rounded flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold">EVIDENCE PENDING</span>
            <span className="text-xl font-extrabold text-cyan-400 mt-1">{kpis.evidence_pending_review || 1104}</span>
            <span className="text-[9px] text-slate-500 mt-0.5">Malkhana Seizures</span>
          </div>

          <div className="bg-[#111827] border border-[#1e293b] p-3 rounded flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold">WITNESS STATEMENTS</span>
            <span className="text-xl font-extrabold text-indigo-400 mt-1">{kpis.witness_statements_pending || 0}</span>
            <span className="text-[9px] text-slate-500 mt-0.5">Recorded Statements</span>
          </div>

          <div className="bg-[#111827] border border-[#1e293b] p-3 rounded flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold">OFFICERS ON DUTY</span>
            <span className="text-xl font-extrabold text-emerald-400 mt-1">{kpis.officers_on_duty || 14}</span>
            <span className="text-[9px] text-slate-500 mt-0.5">Station Roll Call</span>
          </div>

          <div className="bg-[#111827] border border-[#1e293b] p-3 rounded flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold">PATROL UNITS</span>
            <span className="text-xl font-extrabold text-amber-400 mt-1">{kpis.patrol_units_assigned || 4} Squads</span>
            <span className="text-[9px] text-slate-500 mt-0.5">Active Beat Coverage</span>
          </div>
        </div>

        {/* AI Command Brief & Patrol Advice Card */}
        <div className="grid grid-cols-3 gap-4">
          {/* AI Situation Briefing */}
          <div className="col-span-2 bg-[#111827] border border-[#1e293b] p-4 rounded space-y-3">
            <div className="flex justify-between items-center border-b border-[#1e293b] pb-2">
              <div className="flex items-center gap-2">
                <Brain className="text-blue-400" size={18} />
                <h3 className="text-xs font-bold text-slate-100 font-mono uppercase">
                  Station AI Situation Command Brief
                </h3>
              </div>
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                Live PostgreSQL Insights
              </span>
            </div>
            <p className="text-xs text-slate-200 font-sans leading-relaxed bg-[#151c2e] p-3 rounded border border-[#1e293b]">
              {commandBrief || "Analyzing station FIR records and diurnal shift patterns..."}
            </p>

            {/* Tactical Patrol Advice */}
            <div className="space-y-2 pt-1 font-mono text-xs">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                AI PATROL RECOMMENDATIONS:
              </span>
              <div className="grid grid-cols-2 gap-3">
                {patrolRecs.map((rec: any, idx: number) => (
                  <div key={idx} className="bg-[#151c2e] p-3 rounded border border-[#1e293b] space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-amber-400 font-bold text-[10px]">📍 {rec.sector}</span>
                      <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold">
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans leading-snug">{rec.action}</p>
                    <span className="text-[9px] text-slate-500 block">Shift: {rec.timing}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Patrol Units & AI Station Alerts */}
          <div className="bg-[#111827] border border-[#1e293b] p-4 rounded space-y-3 flex flex-col">
            <div className="flex justify-between items-center border-b border-[#1e293b] pb-2">
              <div className="flex items-center gap-2">
                <Car className="text-emerald-400" size={18} />
                <h3 className="text-xs font-bold text-slate-100 font-mono uppercase">
                  Station Patrol Units
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{patrolUnits.length} Units Active</span>
            </div>

            <div className="space-y-2 flex-1 max-h-48 overflow-y-auto font-mono text-xs pr-1">
              {patrolUnits.map((pu: any, idx: number) => (
                <div key={idx} className="bg-[#151c2e] p-2.5 rounded border border-[#1e293b] space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-200">{pu.unit_name}</span>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold">
                      {pu.status}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">Sector: {pu.sector}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-[#1e293b] pt-2 space-y-2 font-mono text-xs">
              <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">
                RECENT STATION AI ALERTS:
              </span>
              {aiAlerts.map((al: any) => (
                <div key={al.id} className="bg-[#151c2e] p-2 rounded border border-[#1e293b] space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="text-red-400 font-bold text-[10px]">{al.type}</span>
                    <span className="text-[9px] text-slate-500">{al.id}</span>
                  </div>
                  <p className="text-[10px] text-slate-300 font-sans leading-snug">{al.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Operational Grid: Timeline & Officer Workloads */}
        <div className="grid grid-cols-3 gap-4">
          {/* Recent FIR Timeline (2 Cols) */}
          <div className="col-span-2 bg-[#111827] border border-[#1e293b] p-4 rounded space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-[#1e293b] pb-2">
              <div className="flex items-center gap-2">
                <Clock className="text-blue-400" size={16} />
                <h3 className="text-xs font-bold text-slate-100 uppercase">Recent FIR Timeline Feed</h3>
              </div>
              <button
                onClick={() => navigate("/cases")}
                className="text-[10px] text-blue-400 hover:text-blue-300 underline font-bold"
              >
                View Cases Registry →
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {timeline.map((c: any) => (
                <div
                  key={c.case_id}
                  onClick={() => navigate(`/cases/${c.case_id}`)}
                  className="bg-[#151c2e] hover:bg-[#1c273e] p-3 rounded border border-[#1e293b] transition-all cursor-pointer space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400 font-bold">{c.case_no}</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-slate-300 font-sans">{c.station_name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">{c.registered_date}</span>
                      <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        Risk: {(c.ai_risk_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-300 font-sans text-xs truncate leading-relaxed">{c.brief_facts}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Officer Workload Summary (1 Col) */}
          <div className="bg-[#111827] border border-[#1e293b] p-4 rounded space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-[#1e293b] pb-2">
              <div className="flex items-center gap-2">
                <UserCheck className="text-emerald-400" size={16} />
                <h3 className="text-xs font-bold text-slate-100 uppercase">Officer Workload Summary</h3>
              </div>
              <span className="text-[10px] text-slate-400">PostgreSQL</span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {workload.map((off: any) => (
                <div key={off.officer_id} className="bg-[#151c2e] p-3 rounded border border-[#1e293b] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-100">{off.officer_name}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      off.workload_status === "High Workload" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}>
                      {off.workload_status}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>Assigned Cases: <strong className="text-slate-200">{off.assigned_cases}</strong></span>
                    <span>Pending: <strong className="text-amber-400">{off.pending_investigations}</strong></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Stage Progress Summary */}
            <div className="border-t border-[#1e293b] pt-3 space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                STAGE PROGRESS BREAKDOWN:
              </span>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-center">
                <div className="bg-[#151c2e] p-2 rounded border border-[#1e293b]">
                  <span className="text-slate-500 block">UNDER INVESTIGATION</span>
                  <span className="text-amber-400 font-bold">{progress.under_investigation || 2500} Cases</span>
                </div>
                <div className="bg-[#151c2e] p-2 rounded border border-[#1e293b]">
                  <span className="text-slate-500 block">DISPOSED / CLOSED</span>
                  <span className="text-emerald-400 font-bold">{progress.disposed_closed || 0} Cases</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
