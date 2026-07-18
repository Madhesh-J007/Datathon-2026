import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { caseService } from "../../services/caseService";
import { intelligenceService } from "../../services/intelligenceService";
import KpiCard from "../../components/common/KpiCard";
import TrendChart from "../../components/charts/TrendChart";
import DataTable from "../../components/common/DataTable";
import { useNavigate } from "react-router-dom";
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
  UserCheck
} from "lucide-react";

interface DashboardProps {
  activeTab?: "executive" | "workspace";
}

export default function Dashboard({ activeTab = "executive" }: DashboardProps) {
  const navigate = useNavigate();
  const [isBriefExpanded, setIsBriefExpanded] = useState(false);

  // Fetch all cases in jurisdiction (limit 100 for statistics)
  const { data: casesData, isLoading: isCasesLoading, isError: isCasesError, refetch: refetchCases } = useQuery({
    queryKey: ["dashboardCases"],
    queryFn: () => caseService.getCases({ pageSize: 100 }),
    retry: 1,
  });

  // Fetch AI anomalies
  const { data: anomaliesData, isLoading: isAnomaliesLoading, isError: isAnomaliesError, refetch: refetchAnomalies } = useQuery({
    queryKey: ["dashboardAnomalies"],
    queryFn: () => intelligenceService.getCaseAnomalies(),
    retry: 1,
  });

  const cases = casesData?.data || [];
  const meta = casesData?.meta || { total: 0 };

  // Calculate metrics
  const totalCases = meta.total;
  const highRiskCases = cases.filter((c: any) => c.AIRiskScore > 0.7 || c.InvestigationPriority === "High").length;
  const pendingCases = cases.filter((c: any) => c.CaseStatusID === 1 || c.CaseStatusID === 2).length;
  const solvedCases = cases.filter((c: any) => c.CaseStatusID === 3 || c.CaseStatusID === 4).length;
  const burglaryCount = cases.filter((c: any) => c.BriefFacts?.toLowerCase().includes("burglary") || c.BriefFacts?.toLowerCase().includes("theft")).length;

  // Process data for District distribution chart
  const districtCounts: Record<string, number> = {};
  cases.forEach((c: any) => {
    const dName = `District #${c.DistrictID || c.PoliceStationID}`;
    districtCounts[dName] = (districtCounts[dName] || 0) + 1;
  });

  const districtChartOptions = {
    title: { text: "District Divisions", show: false },
    xAxis: {
      type: "category",
      data: Object.keys(districtCounts),
      axisLabel: { interval: 0, rotate: 15, color: "#94a3b8" }
    },
    yAxis: { type: "value", axisLabel: { color: "#94a3b8" } },
    series: [
      {
        data: Object.values(districtCounts),
        type: "bar",
        color: "#3b82f6",
        barWidth: "40%",
      },
    ],
  };

  // Process data for Crime Type distribution chart
  const typeCounts: Record<string, number> = {};
  cases.forEach((c: any) => {
    const typeName = `Head ID #${c.CrimeMajorHeadID}`;
    typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
  });

  const crimeTypeChartOptions = {
    title: { text: "Crime Category", show: false },
    tooltip: { trigger: "item" },
    series: [
      {
        type: "pie",
        radius: "55%",
        data: Object.entries(typeCounts).map(([name, value]) => ({ name, value })),
        label: {
          color: "#94a3b8",
        },
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
    return (
      <div className="space-y-6 select-none">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">Investigator Workspace</h1>
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
      <div className="flex justify-between items-center border-b border-[#1e293b] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 uppercase tracking-widest font-mono">
            KSP Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">Real-time situational intelligence and proactive decision support</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded text-xs text-red-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span>CRITICAL STATUS: STAGE II</span>
          </div>
        </div>
      </div>

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

        {/* AI Briefing Metadata block */}
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
              <p>Crime registered activities within active jurisdiction scope: <span className="text-slate-100 font-bold font-mono">{totalCases} total active files</span>.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-mono">•</span>
              <p>AI threat risk engine flagged <span className="text-red-400 font-bold font-mono">{highRiskCases} cases</span> exceeding severity threshold limit.</p>
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

      {/* 2, 3 & 4. ALERTS, RECOMMENDATIONS & TIMELINE SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mission Critical Alerts */}
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

        {/* AI Action Center */}
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

        {/* Mission Timeline Chronology Feed */}
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
          title="Active Cases"
          value={totalCases}
          icon={<FileText size={16} />}
          badges={[
            { label: "↑ 12 Today", type: "success" },
            { label: "18 High Priority", type: "error" },
            { label: "6 Review", type: "warning" }
          ]}
          description="Ongoing cases in jurisdiction."
          loading={isCasesLoading}
        />
        <KpiCard
          title="High Risk Alerts"
          value={highRiskCases}
          icon={<ShieldAlert size={16} />}
          badges={[
            { label: "↑ 2 Today", type: "error" },
            { label: "4 Anomaly flags", type: "warning" }
          ]}
          description="High severity risk score classifications."
          loading={isCasesLoading}
        />
        <KpiCard
          title="Solved Records"
          value={solvedCases}
          icon={<CheckCircle size={16} />}
          badges={[
            { label: "↑ 3 Today", type: "success" },
            { label: "94% target rate", type: "neutral" }
          ]}
          description="Closed or chargesheeted investigations."
          loading={isCasesLoading}
        />
        <KpiCard
          title="Pending Briefs"
          value={pendingCases}
          icon={<Clock size={16} />}
          badges={[
            { label: "3 Overdue", type: "error" },
            { label: "7 Day horizon", type: "neutral" }
          ]}
          description="Awaiting senior closure approvals."
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

      {/* 6. CHARTS ROW (Visual Storytelling Wrapper) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-[#1e293b] rounded p-5">
          <TrendChart
            options={districtChartOptions}
            loading={isCasesLoading}
            headline="District Crime Rates Breakdown"
            aiInsight="District 1 has registered a 24% surge in property-related reports over the past 48 hours."
            recommendation="Dispatch two tactical patrol squads to Sector 1 boundaries to mitigate burglary vectors."
          />
        </div>
        <div className="bg-[#111827] border border-[#1e293b] rounded p-5">
          <TrendChart
            options={crimeTypeChartOptions}
            loading={isCasesLoading}
            headline="Crime Classification Distribution"
            aiInsight="Theft and residential burglaries represent the largest segment (48%) of all ongoing investigations."
            recommendation="Deploy specialized theft division officers for active chargesheet reviews."
          />
        </div>
      </div>
    </div>
  );
}
