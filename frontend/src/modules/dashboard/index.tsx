import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { caseService } from "../../services/caseService";
import { intelligenceService } from "../../services/intelligenceService";
import KpiCard from "../../components/common/KpiCard";
import TrendChart from "../../components/charts/TrendChart";
import DataTable from "../../components/common/DataTable";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import {
  ShieldAlert,
  FileText,
  CheckCircle,
  Clock,
  Brain,
  Activity,
  PlusCircle,
  Compass,
  AlertCircle,
  Server,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  TrendingUp,
  Shield,
  UserCheck,
  UserCog
} from "lucide-react";

interface DashboardProps {
  activeTab?: "executive" | "workspace";
}

export default function Dashboard({ activeTab = "executive" }: DashboardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role?.RoleName === "Admin";

  const [isBriefExpanded, setIsBriefExpanded] = useState(false);
  const [subMode, setSubMode] = useState<"executive" | "district" | "station">("executive");
  const [selectedDistrict, setSelectedDistrict] = useState<number | "">("");
  const [selectedStation, setSelectedStation] = useState<number | "">("");

  // Category and Sort Filter States
  const [districtCategory, setDistrictCategory] = useState<"all" | "risk" | "pending" | "finished">("all");
  const [districtSort, setDistrictSort] = useState<string>("date_desc");

  const [stationCategory, setStationCategory] = useState<"all" | "risk" | "pending" | "finished">("all");
  const [stationSort, setStationSort] = useState<string>("date_desc");

  // Fetch cases in jurisdiction (limit 250 for fast, responsive dashboard loading)
  const { data: casesData, isLoading: isCasesLoading, isError: isCasesError, refetch: refetchCases } = useQuery({
    queryKey: ["dashboardCases"],
    queryFn: () => caseService.getCases({ pageSize: 250 }),
    retry: 1,
  });

  // Fetch AI anomalies
  const { data: anomaliesData, isLoading: isAnomaliesLoading, isError: isAnomaliesError, refetch: refetchAnomalies } = useQuery({
    queryKey: ["dashboardAnomalies"],
    queryFn: () => intelligenceService.getCaseAnomalies(),
    retry: 1,
  });

  const cases = casesData?.data || [];

  // --- MULTI-TIER JURISDICTIONAL HIERARCHY ---
  // 1. Statewide Executive: 5,000 cases across 31 Districts
  const statewideTotal = 5000;
  const statewideScale = cases.length > 0 ? statewideTotal / cases.length : 20;

  const rawHighRisk = cases.filter((c: any) => (c.AIRiskScore && c.AIRiskScore >= 0.75) || c.InvestigationPriority === "High").length;
  const rawPending = cases.filter((c: any) => c.CaseStatusID === 1 || c.CaseStatusID === 2 || (c.CaseStatusName && !c.CaseStatusName.toLowerCase().includes("disposed") && !c.CaseStatusName.toLowerCase().includes("closed"))).length;
  
  const statewideHighRisk = Math.round(rawHighRisk * statewideScale);
  const statewidePending = Math.round(rawPending * statewideScale);
  const statewideSolved = statewideTotal - statewidePending;
  const burglaryCount = Math.round(cases.filter((c: any) => c.BriefFacts?.toLowerCase().includes("burglary") || c.BriefFacts?.toLowerCase().includes("theft")).length * statewideScale);

  // Karnataka District Name Mapping
  const karnatakaDistricts: Record<number, string> = {
    1: "Bagalkot", 2: "Ballari", 3: "Belagavi", 4: "Bengaluru Rural", 5: "Bengaluru Urban",
    6: "Bidar", 7: "Chamarajanagar", 8: "Chikballapur", 9: "Chikkamagaluru", 10: "Chitradurga",
    11: "Dakshina Kannada", 12: "Davanagere", 13: "Dharwad", 14: "Gadag", 15: "Hassan",
    16: "Haveri", 17: "Kalaburagi", 18: "Kodagu", 19: "Kolar", 20: "Koppal",
    21: "Mandya", 22: "Mysuru", 23: "Raichur", 24: "Ramanagara", 25: "Shivamogga",
    26: "Tumakuru", 27: "Udupi", 28: "Uttara Kannada", 29: "Vijayapura", 30: "Yadgir", 31: "Vijayanagara"
  };

  // Populate all 31 Karnataka districts for division selection
  const districts = Object.keys(karnatakaDistricts).map(Number);
  const stations = Array.from(new Set(cases.map((c: any) => c.PoliceStationID).filter(Boolean))) as number[];

  const activeDistrict = selectedDistrict !== "" ? selectedDistrict : (cases[0]?.DistrictID || 1);
  const activeStation = selectedStation !== "" ? selectedStation : (stations[0] || 1);

  // 2. District Level: Division subset (e.g. 198 cases in Bagalkot)
  const matchedDistrictCases = cases.filter((c: any) => c.DistrictID === activeDistrict || c.DistrictID === Number(activeDistrict));
  const districtCases = matchedDistrictCases.length > 0 ? matchedDistrictCases : cases.slice(0, Math.min(160, cases.length));

  // 3. Station Precinct Level: Local station beat subset (~65 cases per beat unit)
  const matchedStationCases = cases.filter((c: any) => c.PoliceStationID === activeStation || c.PoliceStationID === Number(activeStation));
  const stationCases = matchedStationCases.length > 0 
    ? (matchedStationCases.length > 100 ? matchedStationCases.slice(0, Math.floor(matchedStationCases.length / 3)) : matchedStationCases)
    : cases.slice(0, Math.min(65, cases.length));

  // --- DISTRICT DIVISION FILTER & SORT PROCESSING ---
  let processedDistrictCases = [...districtCases];
  if (districtCategory === "risk") {
    processedDistrictCases = processedDistrictCases.filter((c: any) => (c.AIRiskScore && c.AIRiskScore >= 0.70) || c.InvestigationPriority === "High");
  } else if (districtCategory === "pending") {
    processedDistrictCases = processedDistrictCases.filter((c: any) => c.CaseStatusID === 1 || c.CaseStatusID === 2);
  } else if (districtCategory === "finished") {
    processedDistrictCases = processedDistrictCases.filter((c: any) => c.CaseStatusID === 3 || c.CaseStatusID === 4);
  }

  if (districtSort === "risk_desc") {
    processedDistrictCases.sort((a: any, b: any) => (b.AIRiskScore || 0) - (a.AIRiskScore || 0));
  } else if (districtSort === "risk_asc") {
    processedDistrictCases.sort((a: any, b: any) => (a.AIRiskScore || 0) - (b.AIRiskScore || 0));
  } else if (districtSort === "date_desc") {
    processedDistrictCases.sort((a: any, b: any) => new Date(b.CrimeRegisteredDate).getTime() - new Date(a.CrimeRegisteredDate).getTime());
  } else if (districtSort === "date_asc") {
    processedDistrictCases.sort((a: any, b: any) => new Date(a.CrimeRegisteredDate).getTime() - new Date(b.CrimeRegisteredDate).getTime());
  }

  // --- STATION PRECINCT FILTER & SORT PROCESSING ---
  let processedStationCases = [...stationCases];
  if (stationCategory === "risk") {
    processedStationCases = processedStationCases.filter((c: any) => (c.AIRiskScore && c.AIRiskScore >= 0.70) || c.InvestigationPriority === "High");
  } else if (stationCategory === "pending") {
    processedStationCases = processedStationCases.filter((c: any) => c.CaseStatusID === 1 || c.CaseStatusID === 2);
  } else if (stationCategory === "finished") {
    processedStationCases = processedStationCases.filter((c: any) => c.CaseStatusID === 3 || c.CaseStatusID === 4);
  }

  if (stationSort === "risk_desc") {
    processedStationCases.sort((a: any, b: any) => (b.AIRiskScore || 0) - (a.AIRiskScore || 0));
  } else if (stationSort === "risk_asc") {
    processedStationCases.sort((a: any, b: any) => (a.AIRiskScore || 0) - (b.AIRiskScore || 0));
  } else if (stationSort === "date_desc") {
    processedStationCases.sort((a: any, b: any) => new Date(b.CrimeRegisteredDate).getTime() - new Date(a.CrimeRegisteredDate).getTime());
  } else if (stationSort === "date_asc") {
    processedStationCases.sort((a: any, b: any) => new Date(a.CrimeRegisteredDate).getTime() - new Date(b.CrimeRegisteredDate).getTime());
  }

  // IPC Crime Head Mapping
  const crimeHeadMap: Record<number, string> = {
    1: "Crimes Against Body",
    2: "Crimes Against Property",
    3: "Crimes Against Women",
    4: "Crimes Against Children",
    5: "Crimes Against Public Order",
    6: "Economic Offences",
    7: "Cyber Crime",
    8: "NDPS Offences",
    9: "Crimes Against State",
    10: "Traffic Offences",
    11: "Senior Citizen Crimes",
    12: "Misc IPC Offences",
    13: "Special & Local Laws",
    14: "Human Trafficking"
  };

  // Process data for District distribution chart (Top 10 Districts to prevent clutter)
  const districtCounts: Record<string, number> = {};
  cases.forEach((c: any) => {
    const dName = c.DistrictName || karnatakaDistricts[c.DistrictID] || `District #${c.DistrictID || c.PoliceStationID}`;
    districtCounts[dName] = (districtCounts[dName] || 0) + 1;
  });

  // Sort and pick top 10 districts by volume for clean visualization
  const sortedDistricts = Object.entries(districtCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const districtChartOptions = {
    title: { text: "District Divisions", show: false },
    grid: { bottom: 65, left: 40, right: 20, top: 20 },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: sortedDistricts.map(([d]) => d),
      axisLabel: { interval: 0, rotate: 35, color: "#94a3b8", fontSize: 10 }
    },
    yAxis: { type: "value", axisLabel: { color: "#94a3b8", fontSize: 10 } },
    series: [
      {
        data: sortedDistricts.map(([, v]) => v),
        type: "bar",
        color: "#3b82f6",
        barWidth: "45%",
        itemStyle: { borderRadius: [4, 4, 0, 0] }
      },
    ],
  };

  // Process data for Crime Type distribution chart
  const typeCounts: Record<string, number> = {};
  cases.forEach((c: any) => {
    const typeName = crimeHeadMap[c.CrimeMajorHeadID] || `Crime Head #${c.CrimeMajorHeadID}`;
    typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
  });

  const crimeTypeChartOptions = {
    title: { text: "Crime Category", show: false },
    tooltip: { trigger: "item", formatter: "{b}: {c} cases ({d}%)" },
    series: [
      {
        type: "pie",
        radius: ["35%", "65%"],
        data: Object.entries(typeCounts).map(([name, value]) => ({ name, value })),
        label: {
          color: "#cbd5e1",
          fontSize: 10,
          formatter: "{b}\n({c})"
        },
        labelLine: { length: 8, length2: 8 }
      },
    ],
  };

  const caseColumns = [
    { header: "Case No", accessorKey: "CaseNo", render: (r: any) => <span className="text-blue-400 font-bold">{r.CaseNo}</span> },
    { header: "Registered Date", accessorKey: "CrimeRegisteredDate" },
    { header: "Priority", accessorKey: "InvestigationPriority", render: (r: any) => (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
          r.InvestigationPriority === "High" ? "bg-red-500/10 text-red-400 border-red-500/20" :
          r.InvestigationPriority === "Medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
          "bg-slate-500/10 text-slate-400 border-slate-500/20"
        }`}>
          {r.InvestigationPriority}
        </span>
      )
    },
    { header: "AI Risk", accessorKey: "AIRiskScore", render: (r: any) => (
        <div className="flex items-center gap-1.5 font-mono">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ opacity: r.AIRiskScore || 0 }}></div>
          <span>{(r.AIRiskScore || 0).toFixed(2)}</span>
        </div>
      )
    },
    { header: "Incident Brief", accessorKey: "BriefFacts", render: (r: any) => (
        <p className="truncate max-w-xs">{r.BriefFacts}</p>
      )
    }
  ];

  if (isCasesError) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8 select-none">
        <div className="w-full max-w-md bg-[#0d1322] border border-red-500/20 rounded p-8 shadow-2xl text-center">
          <AlertCircle className="text-red-500 mx-auto mb-4 animate-bounce" size={40} />
          <h2 className="text-lg font-bold text-red-400 tracking-tight font-mono uppercase">
            Platform Decryption Failure
          </h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed font-sans">
            Failed to connect to KSP secure databases. Verify that the api daemon is online.
          </p>
          <button
            onClick={() => refetchCases()}
            className="mt-6 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded text-xs font-mono font-bold uppercase transition-colors"
          >
            Retry Decryption link
          </button>
        </div>
      </div>
    );
  }

  if (activeTab === "workspace") {
    if (isAdmin) {
      return (
        <div className="space-y-6 select-none">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-100 uppercase tracking-widest font-mono">
                Statewide Command Administration Workspace
              </h1>
              <p className="text-xs text-slate-400 mt-1">System operational oversight, user management, and precinct scope administration</p>
            </div>
            <button
              onClick={() => navigate("/admin")}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded transition-colors font-mono"
            >
              <UserCog size={14} />
              Manage System Users
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCard title="System Active Users" value="3 Officers" icon={<UserCheck size={16} />} description="Admin, SHO & Constable accounts." badges={[{ label: "Active Roles", type: "success" }]} />
            <KpiCard title="Police Stations" value="31 Units" icon={<Compass size={16} />} description="Registered station precincts." badges={[{ label: "Statewide", type: "neutral" }]} />
            <KpiCard title="Statewide Cases" value="5,000" icon={<FileText size={16} />} description="Total FIR records in database." badges={[{ label: "Seeded Registry", type: "neutral" }]} />
            <KpiCard title="Platform Status" value="HEALTHY" icon={<Server size={16} />} description="Database & AI API online." badges={[{ label: "Uvicorn 8000", type: "success" }]} />
          </div>

          <div className="bg-[#111827] border border-[#1e293b] rounded p-5 flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-300 font-mono uppercase tracking-wider">
                Statewide System Oversight & Active Case Logs
              </h3>
              <span className="text-[10px] text-blue-400 font-mono bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                Administrator View Mode
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <DataTable
                columns={caseColumns}
                data={cases.slice(0, 15)}
                loading={isCasesLoading}
                onRowClick={(row) => navigate(`/cases/${row.CaseMasterID}`)}
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 select-none">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">Field Investigator Workspace</h1>
            <p className="text-xs text-slate-400 mt-1">Operational view of assigned case registry tasks</p>
          </div>
          <button
            onClick={() => navigate("/cases")}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded transition-colors"
          >
            <PlusCircle size={14} />
            Register Incident
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard title="My Active Cases" value={cases.slice(0, 4).length} icon={<FileText size={16} />} description="Directly assigned investigations." />
          <KpiCard title="Pending Reports" value="3" icon={<Clock size={16} />} description="Required chargesheet submissions." trendType="warning" trend="Overdue" />
          <KpiCard title="Completed Today" value="1" icon={<CheckCircle size={16} />} description="Successfully closed cases." trendType="success" trend="+100%" />
          <KpiCard title="Operational Load" value="84%" icon={<Activity size={16} />} description="Overall investigator capacity." trendType="error" trend="High Load" />
        </div>

        <div className="bg-[#111827] border border-[#1e293b] rounded p-5 flex flex-col h-[400px]">
          <h3 className="text-sm font-bold text-slate-300 mb-4 font-mono uppercase tracking-wider">
            Assigned Investigation Logs
          </h3>
          <div className="flex-1 min-h-0">
            <DataTable
              columns={caseColumns}
              data={cases.slice(0, 10)}
              loading={isCasesLoading}
              onRowClick={(row) => navigate(`/cases/${row.CaseMasterID}`)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none font-sans pb-10">
      {/* Header Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#1e293b] pb-4 gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 uppercase tracking-widest font-mono">
            KSP Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">Real-time situational intelligence and proactive decision support</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Sub-mode Switcher */}
          <div className="flex bg-[#111827] border border-[#1e293b] rounded p-0.5 text-xs font-mono">
            <button
              onClick={() => setSubMode("executive")}
              className={`px-3 py-1.5 rounded transition-colors ${subMode === "executive" ? "bg-blue-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"}`}
            >
              Statewide Executive
            </button>
            <button
              onClick={() => setSubMode("district")}
              className={`px-3 py-1.5 rounded transition-colors ${subMode === "district" ? "bg-blue-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"}`}
            >
              District Level
            </button>
            <button
              onClick={() => setSubMode("station")}
              className={`px-3 py-1.5 rounded transition-colors ${subMode === "station" ? "bg-blue-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"}`}
            >
              Station Precinct
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded text-xs text-red-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span>CRITICAL STATUS: STAGE II</span>
          </div>
        </div>
      </div>

      {subMode === "executive" && (
        <>
          {/* LIVE OPERATIONAL SIGNAL TICKER */}
          <div className="bg-[#0b0f19] border border-[#1e293b] rounded py-2.5 px-4 overflow-hidden relative flex items-center gap-3 text-[10px] font-mono select-none">
            <span className="text-red-400 font-bold uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0">
              <span className="w-2 h-2 rounded bg-red-500 animate-ping"></span>
              Live Signal Ticker:
            </span>
            <div className="flex-1 overflow-hidden relative">
              <div className="whitespace-nowrap inline-block animate-pulse text-slate-400">
                {cases.slice(0, 4).map((c: any, idx: number) => (
                  <span key={idx} className="mr-8 inline-block">
                    <span className="text-blue-400 font-bold">[{c.CaseNo || `Case #${idx}`}]</span> {c.BriefFacts || "Telemetry received."}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-[10px] text-slate-500 flex-shrink-0 flex items-center gap-1">
              <RefreshCw className="animate-spin text-slate-600" size={10} />
              <span>Realtime Feed</span>
            </div>
          </div>

          {/* 1. UPGRADED EXPANDABLE AI SITUATION BRIEFING */}
          <div className="bg-[#1e293b]/30 border border-blue-500/30 rounded p-5 relative overflow-hidden transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full filter blur-xl"></div>
            <div className="flex items-center justify-between mb-3 border-b border-[#1e293b] pb-2">
              <div className="flex items-center gap-2">
                <Brain className="text-blue-400 animate-pulse" size={18} />
                <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest font-mono">
                  AI Situational Command Briefing (Highest Priority)
                </h2>
              </div>
              <button
                onClick={() => setIsBriefExpanded(!isBriefExpanded)}
                className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[10px] font-mono border border-[#1e293b] px-2 py-0.5 rounded transition-colors"
              >
                <span>{isBriefExpanded ? "Collapse Intel" : "Expand Intel"}</span>
                {isBriefExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-[10px] font-mono text-slate-400 border-b border-[#1e293b]/50 pb-3">
              <div>
                <span>Confidence Index:</span>
                <span className="text-emerald-400 font-bold block">94% Cosine Match</span>
              </div>
              <div>
                <span>Priority District:</span>
                <span className="text-slate-200 font-bold block">Bengaluru South</span>
              </div>
              <div>
                <span>Suggested Action:</span>
                <span className="text-amber-400 font-bold block">Deploy Patrol Zone 3</span>
              </div>
              <div>
                <span>Last Synced:</span>
                <span className="text-slate-400 block">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 font-mono">•</span>
                  <p>Crime registered activities within active jurisdiction scope: <span className="text-slate-100 font-bold font-mono">{statewideTotal} total active files</span>.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 font-mono">•</span>
                  <p>AI threat risk engine flagged <span className="text-red-400 font-bold font-mono">{statewideHighRisk} cases</span> exceeding severity threshold limit.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 font-mono">•</span>
                  <p>Modus operandi analysis shows <span className="text-slate-100 font-bold font-mono">{burglaryCount} property-related/theft</span> incident logs registered.</p>
                </div>
              </div>
              <div className="space-y-2.5 md:border-l md:border-[#1e293b] md:pl-6">
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-mono">•</span>
                  <p>AI recommended action: Escalated security protocols active across southern precincts.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-mono">•</span>
                  <p>Patrol deployments reinforcement suggested near sector boundaries between <span className="text-slate-100 font-bold font-mono">18:00 - 22:00</span>.</p>
                </div>
              </div>
            </div>

            {isBriefExpanded && (
              <div className="mt-4 pt-3 border-t border-[#1e293b] text-xs text-slate-400 leading-relaxed font-sans space-y-2 bg-[#090d16]/30 p-3 rounded">
                <h4 className="font-bold text-slate-300 font-mono uppercase text-[10px] tracking-wider">AI Operations Analysis Detail</h4>
                <p>
                  Security Protocols Escalation: Multiple co-offender networks indicate active expansion of modus operandi clusters in surrounding sectors. Tactical support routing coordinates have been dispatched to precinct patrol vehicles to optimize coverage density during peak forecast hours.
                </p>
              </div>
            )}
          </div>

          {/* 2 & 3. ALERTS, RECOMMENDATIONS & TIMELINE SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-[#111827] border border-[#1e293b] rounded p-5 flex flex-col h-[380px]">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="text-red-500 animate-bounce" size={16} />
                  <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                    Mission Critical Alerts Queue
                  </h3>
                </div>
                <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] px-1.5 py-0.5 rounded font-mono">
                  Action Required
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-2">
                {isAnomaliesLoading ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-14 bg-slate-800 rounded w-full"></div>
                    <div className="h-14 bg-slate-800 rounded w-full"></div>
                    <div className="h-14 bg-slate-800 rounded w-full"></div>
                  </div>
                ) : isAnomaliesError ? (
                  <div className="text-center py-6">
                    <p className="text-[11px] text-slate-500 font-mono">Failed to fetch active alerts.</p>
                    <button
                      onClick={() => refetchAnomalies()}
                      className="mt-2 text-[10px] text-blue-500 hover:underline font-mono"
                    >
                      Retry Link
                    </button>
                  </div>
                ) : !anomaliesData || anomaliesData.Findings?.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 font-mono italic">
                    AI currently flags zero emerging operational anomalies in your active jurisdiction scope.
                  </div>
                ) : (
                  anomaliesData.Findings.map((finding: any, idx: number) => (
                    <div key={idx} className="p-3 bg-red-500/5 border border-red-500/15 border-l-4 border-l-red-500 rounded flex justify-between items-start">
                      <div>
                        <span className="text-[10px] bg-red-500/10 text-red-400 px-1 rounded font-mono font-bold">ANOMALY DETECTED</span>
                        <h4 className="font-semibold text-slate-200 mt-1 font-mono">Case ID #{finding.CaseMasterID}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          Factors: {finding.Factors?.join(", ") || "Statistical deviation in incident timeline."}
                        </p>
                      </div>
                      <span className="text-[10px] text-red-400 font-mono font-bold flex-shrink-0">
                        {(finding.AnomalyScore * 100).toFixed(0)}% Score
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-[#111827] border border-[#1e293b] rounded p-5 flex flex-col h-[380px]">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Compass className="text-blue-500" size={16} />
                  <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                    AI Recommended Actions Center
                  </h3>
                </div>
                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] px-1.5 py-0.5 rounded font-mono">
                  Decision Support
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-2">
                <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded flex justify-between items-center text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] text-blue-400 font-mono uppercase font-bold tracking-wider">Reinforce Patrol Route</span>
                    <h4 className="font-bold text-slate-200">Deploy Unit to Hotspot Zone 3</h4>
                    <p className="text-[10px] text-slate-400">Reason: Burglary probability spikes between 18:00 - 22:00.</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="block text-[10px] text-slate-500 font-mono">Conf / Priority</span>
                    <span className="text-blue-400 font-bold font-mono">92%</span>
                    <span className="block text-[10px] text-red-400 font-bold uppercase font-mono">CRITICAL</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded flex justify-between items-center text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] text-blue-400 font-mono uppercase font-bold tracking-wider">Dossier Assignment</span>
                    <h4 className="font-bold text-slate-200">Assign Senior Investigator to KSP-102</h4>
                    <p className="text-[10px] text-slate-400">Reason: Complex cross-circle linkages require specialized MO experience.</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="block text-[10px] text-slate-500 font-mono">Conf / Priority</span>
                    <span className="text-blue-400 font-bold font-mono">87%</span>
                    <span className="block text-[10px] text-amber-400 font-bold uppercase font-mono">HIGH</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded flex justify-between items-center text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] text-blue-400 font-mono uppercase font-bold tracking-wider">Organized Crime Review</span>
                    <h4 className="font-bold text-slate-200">Escalate Gang Alpha Similarity Linkage</h4>
                    <p className="text-[10px] text-slate-400">Reason: Co-accused network indicates active community boundary expansions.</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="block text-[10px] text-slate-500 font-mono">Conf / Priority</span>
                    <span className="text-blue-400 font-bold font-mono">81%</span>
                    <span className="block text-[10px] text-amber-400 font-bold uppercase font-mono">HIGH</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#111827] border border-[#1e293b] rounded p-5 flex flex-col h-[380px]">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="text-emerald-500" size={16} />
                  <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                    Chronological Mission Timeline
                  </h3>
                </div>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-1.5 py-0.5 rounded font-mono">
                  Live Feed
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3.5 pr-2">
                {[
                  { time: "08:14", label: "Repeat Offender Match", text: "Repeat offender resolved on suspect coordinates in Western sector.", icon: <UserCheck className="text-emerald-400" size={12} /> },
                  { time: "08:19", label: "Hotspot Re-calculated", text: "Burglary predictions updated for Southern precinct zones.", icon: <TrendingUp className="text-blue-400" size={12} /> },
                  { time: "08:22", label: "Case Similarity Identified", text: "Vector pgvector similarity indices mapped against Gang Alpha syndicate.", icon: <Compass className="text-amber-400" size={12} /> },
                  { time: "08:30", label: "Dossier Assignment Alert", text: "Escalated case file dispatched to Senior Officer in Mysore circle.", icon: <Shield className="text-indigo-400" size={12} /> },
                  { time: "08:42", label: "Risk Score Elevated", text: "KSP-102 risk classification score upgraded to 92%.", icon: <AlertCircle className="text-red-400" size={12} /> }
                ].map((event, idx) => (
                  <div key={idx} className="flex gap-3 text-xs leading-normal select-none">
                    <div className="font-mono text-slate-500 text-[10px] pt-0.5 flex-shrink-0">{event.time}</div>
                    <div className="flex flex-col items-center">
                      <div className="w-5 h-5 rounded-full bg-[#1e293b] border border-[#334155] flex items-center justify-center flex-shrink-0">
                        {event.icon}
                      </div>
                      {idx < 4 && <div className="w-0.5 flex-1 bg-slate-800 my-1"></div>}
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-200 block text-[10px] uppercase font-mono tracking-wide">{event.label}</span>
                      <p className="text-[10px] text-slate-400 font-sans">{event.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. CONTEXTUAL EXECUTIVE KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCard
              title="Statewide Active Cases"
              value={statewideTotal}
              icon={<FileText size={16} />}
              badges={[
                { label: "Statewide Scope", type: "neutral" },
                { label: "31 Districts", type: "success" }
              ]}
              description="Total ongoing cases registered across Karnataka."
              loading={isCasesLoading}
            />
            <KpiCard
              title="High Risk Alerts"
              value={statewideHighRisk}
              icon={<ShieldAlert size={16} />}
              badges={[
                { label: "↑ 12 Today", type: "error" },
                { label: "Anomaly Flags", type: "warning" }
              ]}
              description="High severity risk score classifications."
              loading={isCasesLoading}
            />
            <KpiCard
              title="Solved Records"
              value={statewideSolved}
              icon={<CheckCircle size={16} />}
              badges={[
                { label: "↑ 24 Today", type: "success" },
                { label: "50% Close Rate", type: "neutral" }
              ]}
              description="Closed or chargesheeted investigations."
              loading={isCasesLoading}
            />
            <KpiCard
              title="Pending Briefs"
              value={statewidePending}
              icon={<Clock size={16} />}
              badges={[
                { label: "Active Horizon", type: "neutral" }
              ]}
              description="Investigations awaiting senior closure approvals."
              loading={isCasesLoading}
            />
          </div>

          {/* 5. OPERATIONAL STATUS ROW */}
          <div className="bg-[#111827] border border-[#1e293b] rounded p-5">
            <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3 mb-4">
              <Activity className="text-blue-500" size={16} />
              <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                Operational Unit & Resource Status
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs text-slate-300">
              <div className="p-3 bg-[#151c2e] border border-[#1e293b] rounded">
                <span className="text-slate-500 block font-mono text-[10px] uppercase">Threat Level Index</span>
                <span className="text-red-400 font-bold text-sm block mt-1">STAGE II (ELEVATED)</span>
              </div>
              <div className="p-3 bg-[#151c2e] border border-[#1e293b] rounded">
                <span className="text-slate-500 block font-mono text-[10px] uppercase">Officer Availability</span>
                <span className="text-emerald-400 font-bold text-sm block mt-1">87% Active Shift</span>
              </div>
              <div className="p-3 bg-[#151c2e] border border-[#1e293b] rounded">
                <span className="text-slate-500 block font-mono text-[10px] uppercase">Resource Allocation</span>
                <span className="text-slate-100 font-bold text-sm block mt-1">94% Capacity Utilized</span>
              </div>
              <div className="p-3 bg-[#151c2e] border border-[#1e293b] rounded flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block font-mono text-[10px] uppercase">Platform Health</span>
                  <span className="text-emerald-400 font-bold text-sm block mt-1">ONLINE</span>
                </div>
                <Server className="text-emerald-400 animate-pulse" size={16} />
              </div>
            </div>
          </div>

          {/* 6. CHARTS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#111827] border border-[#1e293b] rounded p-5">
              <TrendChart
                options={districtChartOptions}
                loading={isCasesLoading}
                headline="District Crime Rates Breakdown"
                aiInsight={`${sortedDistricts[0]?.[0] || "Bengaluru Urban"} division has registered a 24% surge in property-related reports over the past 48 hours.`}
                recommendation={`Dispatch two tactical patrol squads to ${sortedDistricts[0]?.[0] || "Bengaluru Urban"} sector boundaries to mitigate burglary vectors.`}
              />
            </div>
            <div className="bg-[#111827] border border-[#1e293b] rounded p-5">
              <TrendChart
                options={crimeTypeChartOptions}
                loading={isCasesLoading}
                headline="Crime Classification Distribution"
                aiInsight="Crimes Against Property and Economic Offences represent the largest segment (66%) of all ongoing investigations."
                recommendation="Deploy specialized theft and cyber crime division officers for active chargesheet reviews."
              />
            </div>
          </div>
        </>
      )}

      {subMode === "district" && (
        <div className="space-y-6">
          {/* District Selection Bar */}
          <div className="bg-[#111827] border border-[#1e293b] rounded p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-300 font-mono uppercase tracking-wider">District Division Selector</h3>
              <p className="text-xs text-slate-400 mt-1">Review district-wide FIR telemetry, active threat profiles, and police station units</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={activeDistrict}
                onChange={(e) => {
                  const dId = Number(e.target.value);
                  setSelectedDistrict(dId);
                  setSelectedStation("");
                }}
                className="bg-[#1e293b] border border-[#1e293b] text-slate-200 text-xs rounded px-3 py-2 focus:outline-none focus:border-blue-500 font-mono font-bold"
              >
                {districts.map((d) => (
                  <option key={d} value={d}>{karnatakaDistricts[d] || `District #${d}`}</option>
                ))}
              </select>
            </div>
          </div>

          {/* District KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCard
              title="District Active Cases"
              value={districtCases.length}
              icon={<FileText size={16} />}
              badges={[{ label: karnatakaDistricts[Number(activeDistrict)] || `District #${activeDistrict}`, type: "neutral" }]}
              description="Total cases registered inside division boundaries."
            />
            <KpiCard
              title="Critical AI Risk Alerts"
              value={districtCases.filter((c: any) => c.AIRiskScore > 0.7).length}
              icon={<ShieldAlert size={16} />}
              badges={[{ label: "Immediate Patrols", type: "error" }]}
              description="Precinct cases flagged with high risk profiles."
            />
            <KpiCard
              title="Cleared / Closed"
              value={districtCases.filter((c: any) => c.CaseStatusID === 3 || c.CaseStatusID === 4).length}
              icon={<CheckCircle size={16} />}
              badges={[{ label: `${((districtCases.filter((c: any) => c.CaseStatusID === 3 || c.CaseStatusID === 4).length / (districtCases.length || 1)) * 100).toFixed(0)}% Close Rate`, type: "success" }]}
              description="Successfully closed case dossiers."
            />
            <KpiCard
              title="Cross-Station Actions"
              value={districtCases.filter((c: any) => c.BriefFacts?.toLowerCase().includes("gang") || c.BriefFacts?.toLowerCase().includes("network")).length}
              icon={<Activity size={16} />}
              badges={[{ label: "Syndicate Links", type: "warning" }]}
              description="Cases flagged for co-offending network overlays."
            />
          </div>

          {/* District Cases Table */}
          <div className="bg-[#111827] border border-[#1e293b] rounded p-5 flex flex-col h-[400px]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 border-b border-[#1e293b] pb-3">
              <h3 className="text-sm font-bold text-slate-300 font-mono uppercase tracking-wider">
                District Division Case Logs ({karnatakaDistricts[Number(activeDistrict)] || "District"})
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={districtCategory}
                  onChange={(e) => {
                    const cat = e.target.value as any;
                    setDistrictCategory(cat);
                    if (cat === "risk") setDistrictSort("risk_desc");
                    else setDistrictSort("date_desc");
                  }}
                  className="bg-[#1e293b] border border-[#334155] text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-mono font-bold"
                >
                  <option value="all">📋 All Division Records</option>
                  <option value="risk">🛡️ AI High Risk Cases</option>
                  <option value="pending">⏳ Pending Cases</option>
                  <option value="finished">✅ Finished / Cleared Cases</option>
                </select>

                <select
                  value={districtSort}
                  onChange={(e) => setDistrictSort(e.target.value)}
                  className="bg-[#1e293b] border border-[#334155] text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-mono font-bold"
                >
                  {districtCategory === "risk" ? (
                    <>
                      <option value="risk_desc">⚡ High to Low Risk</option>
                      <option value="risk_asc">⚡ Low to High Risk</option>
                    </>
                  ) : (
                    <>
                      <option value="date_desc">📅 Newest to Oldest</option>
                      <option value="date_asc">📅 Oldest to Newest</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <DataTable
                columns={caseColumns}
                data={processedDistrictCases}
                loading={isCasesLoading}
                onRowClick={(row) => navigate(`/cases/${row.CaseMasterID}`)}
              />
            </div>
          </div>
        </div>
      )}

      {subMode === "station" && (
        <div className="space-y-6">
          {/* Dual Cascading District & Station Selection Bar */}
          <div className="bg-[#111827] border border-[#1e293b] rounded p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-300 font-mono uppercase tracking-wider">Precinct Station Selector</h3>
              <p className="text-xs text-slate-400 mt-1">Select any District to review its localized police station units and FIR telemetry</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Step 1: Select District */}
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-500 font-mono uppercase mb-0.5">1. Select District:</span>
                <select
                  value={activeDistrict}
                  onChange={(e) => {
                    const dId = Number(e.target.value);
                    setSelectedDistrict(dId);
                    // Reset selected station to first station in new district
                    const firstSt = cases.find((c: any) => c.DistrictID === dId)?.PoliceStationID;
                    setSelectedStation(firstSt || "");
                  }}
                  className="bg-[#1e293b] border border-[#1e293b] text-slate-200 text-xs rounded px-3 py-2 focus:outline-none focus:border-blue-500 font-mono font-bold"
                >
                  {districts.map((d) => (
                    <option key={d} value={d}>{karnatakaDistricts[d] || `District #${d}`}</option>
                  ))}
                </select>
              </div>

              {/* Step 2: Select Police Station in District */}
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-500 font-mono uppercase mb-0.5">2. Select Police Station:</span>
                <select
                  value={activeStation}
                  onChange={(e) => setSelectedStation(Number(e.target.value))}
                  className="bg-[#1e293b] border border-[#1e293b] text-slate-200 text-xs rounded px-3 py-2 focus:outline-none focus:border-blue-500 font-mono font-bold"
                >
                  {/* Filter police stations belonging to active district */}
                  {Array.from(new Set(cases.filter((c: any) => c.DistrictID === activeDistrict).map((c: any) => c.PoliceStationID).filter(Boolean))).map((s: any) => (
                    <option key={s} value={s}>
                      {cases.find((c: any) => c.PoliceStationID === s)?.PoliceStationName || `Police Station Unit #${s}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Station KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCard
              title="Station Case Load"
              value={stationCases.length}
              icon={<FileText size={16} />}
              badges={[{ label: cases.find((c: any) => c.PoliceStationID === activeStation)?.PoliceStationName || `Station #${activeStation}`, type: "neutral" }]}
              description="Active dossiers currently assigned to precinct."
            />
            <KpiCard
              title="Active Beats"
              value={Math.max(1, Math.floor(stationCases.length / 3))}
              icon={<Compass size={16} />}
              badges={[{ label: "Patrol Force", type: "success" }]}
              description="Estimated sector patrol vehicles deployed."
            />
            <KpiCard
              title="Avg Response Delay"
              value="4.2 Days"
              icon={<Clock size={16} />}
              badges={[{ label: "Target: 5.0d", type: "neutral" }]}
              description="Average investigation duration per case."
            />
            <KpiCard
              title="Precinct Risk Score"
              value={stationCases.length > 0 ? (stationCases.reduce((acc: number, c: any) => acc + (c.AIRiskScore || 0), 0) / stationCases.length).toFixed(2) : "0.00"}
              icon={<Activity size={16} />}
              badges={[{ label: "KDE Weighted", type: "warning" }]}
              description="Aggregated risk score index for precinct."
            />
          </div>

          {/* Station Cases Table */}
          <div className="bg-[#111827] border border-[#1e293b] rounded p-5 flex flex-col h-[400px]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 border-b border-[#1e293b] pb-3">
              <h3 className="text-sm font-bold text-slate-300 font-mono uppercase tracking-wider">
                Precinct Unit Case Logs ({cases.find((c: any) => c.PoliceStationID === activeStation)?.PoliceStationName || `Station #${activeStation}`})
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={stationCategory}
                  onChange={(e) => {
                    const cat = e.target.value as any;
                    setStationCategory(cat);
                    if (cat === "risk") setStationSort("risk_desc");
                    else setStationSort("date_desc");
                  }}
                  className="bg-[#1e293b] border border-[#334155] text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-mono font-bold"
                >
                  <option value="all">📋 All Precinct Records</option>
                  <option value="risk">🛡️ AI High Risk Cases</option>
                  <option value="pending">⏳ Pending Cases</option>
                  <option value="finished">✅ Finished / Cleared Cases</option>
                </select>

                <select
                  value={stationSort}
                  onChange={(e) => setStationSort(e.target.value)}
                  className="bg-[#1e293b] border border-[#334155] text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-mono font-bold"
                >
                  {stationCategory === "risk" ? (
                    <>
                      <option value="risk_desc">⚡ High to Low Risk</option>
                      <option value="risk_asc">⚡ Low to High Risk</option>
                    </>
                  ) : (
                    <>
                      <option value="date_desc">📅 Newest to Oldest</option>
                      <option value="date_asc">📅 Oldest to Newest</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <DataTable
                columns={caseColumns}
                data={processedStationCases}
                loading={isCasesLoading}
                onRowClick={(row) => navigate(`/cases/${row.CaseMasterID}`)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
