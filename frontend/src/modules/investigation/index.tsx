import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { caseService } from "../../services/caseService";
import { intelligenceService } from "../../services/intelligenceService";
import DataTable from "../../components/common/DataTable";
import ExplanationCard from "../../components/charts/ExplanationCard";
import NetworkGraphCanvas from "../../components/graph/NetworkGraphCanvas";
import {
  FileText,
  User,
  Shield,
  Clock,
  Search,
  Package,
  FolderOpen,
  Share2,
  Compass
} from "lucide-react";

export default function Investigation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const caseId = id ? parseInt(id) : null;
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [selectedCompareCase, setSelectedCompareCase] = useState<any>(null);

  // Query search & filters
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [stationId, setStationId] = useState("");
  const [statusId, setStatusId] = useState("");

  // Fetch Cases list
  const { data: listData, isLoading: isListLoading } = useQuery({
    queryKey: ["casesList", page, search, stationId, statusId],
    queryFn: () =>
      caseService.getCases({
        page,
        pageSize: 15,
        search: search.trim() || undefined,
        stationId: stationId ? parseInt(stationId) : undefined,
        statusId: statusId ? parseInt(statusId) : undefined,
      }),
    enabled: !caseId,
  });

  // Fetch Case Details
  const { data: caseDetails, isLoading: isDetailsLoading } = useQuery({
    queryKey: ["caseDetails", caseId],
    queryFn: () => caseService.getCaseDetails(caseId!),
    enabled: !!caseId,
  });

  // Fetch Case Accused
  const { data: accusedData } = useQuery({
    queryKey: ["caseAccused", caseId],
    queryFn: () => caseService.getCaseAccused(caseId!),
    enabled: !!caseId && activeSubTab === "people",
  });

  // Fetch Case Victims
  const { data: victimsData } = useQuery({
    queryKey: ["caseVictims", caseId],
    queryFn: () => caseService.getCaseVictims(caseId!),
    enabled: !!caseId && activeSubTab === "people",
  });

  // Fetch Case Evidence
  const { data: evidenceData } = useQuery({
    queryKey: ["caseEvidence", caseId],
    queryFn: () => caseService.getCaseEvidence(caseId!),
    enabled: !!caseId && activeSubTab === "evidence",
  });

  // Fetch Case Vehicles
  useQuery({
    queryKey: ["caseVehicles", caseId],
    queryFn: () => caseService.getCaseVehicles(caseId!),
    enabled: !!caseId && activeSubTab === "evidence",
  });

  // Fetch Case Witnesses
  const { data: witnessesData } = useQuery({
    queryKey: ["caseWitnesses", caseId],
    queryFn: () => caseService.getCaseWitnesses(caseId!),
    enabled: !!caseId && activeSubTab === "evidence",
  });

  // Fetch AI Risk Scorer details
  const { data: aiRiskData, isLoading: isRiskLoading } = useQuery({
    queryKey: ["caseRisk", caseId],
    queryFn: () => intelligenceService.predictCaseRisk(caseId!),
    enabled: !!caseId && activeSubTab === "ai",
  });

  // Fetch Similar Cases
  const { data: similarCasesData, isLoading: isSimilarLoading } = useQuery({
    queryKey: ["similarCases", caseId],
    queryFn: () => intelligenceService.getSimilarCases(caseId!),
    enabled: !!caseId && activeSubTab === "similar",
  });

  // Embeddings Backfiller Mutation
  const backfillMutation = useMutation({
    mutationFn: () => intelligenceService.backfillEmbeddings(),
    onSuccess: () => {
      alert("LaBSE sentence embeddings backfilled successfully.");
      queryClient.invalidateQueries({ queryKey: ["similarCases"] });
    },
  });

  if (!caseId) {
    // ----------------------------------------------------
    // CASE LIST VIEW
    // ----------------------------------------------------
    const columns = [
      { header: "Case Number", accessorKey: "CaseNo", render: (r: any) => <span className="text-blue-400 font-bold font-mono">{r.CaseNo}</span> },
      { header: "Reg Date", accessorKey: "CrimeRegisteredDate" },
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
      { header: "Severity ID", accessorKey: "GravityOffenceID", render: (r: any) => (
          <span className="font-mono text-slate-300">Level {r.GravityOffenceID}</span>
        )
      },
      { header: "AI Risk Score", accessorKey: "AIRiskScore", render: (r: any) => (
          <span className="font-mono font-bold text-red-400">{(r.AIRiskScore || 0).toFixed(2)}</span>
        )
      },
      { header: "Brief Facts", accessorKey: "BriefFacts", render: (r: any) => <p className="truncate max-w-sm">{r.BriefFacts}</p> }
    ];

    return (
      <div className="space-y-5 h-full flex flex-col select-none">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Case Intelligence Registry</h1>
          <p className="text-xs text-slate-400 mt-1">Investigate registered FIR files within permitted jurisdictions</p>
        </div>

        {/* Filter controls bar */}
        <div className="bg-[#111827] border border-[#1e293b] rounded p-4 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by Case Number or Brief Facts..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-[#1e293b] border border-[#1e293b] text-slate-200 text-xs rounded pl-9 pr-4 py-2 focus:outline-none focus:border-blue-500"
            />
            <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
          </div>

          <div className="flex gap-3">
            <select
              value={stationId}
              onChange={(e) => { setStationId(e.target.value); setPage(1); }}
              className="bg-[#1e293b] border border-[#1e293b] text-slate-200 text-xs rounded px-3 py-2 focus:outline-none"
            >
              <option value="">All Police Stations</option>
              <option value="1">HQ Station</option>
              <option value="2">Mysuru Station</option>
              <option value="3">Belagavi Station</option>
            </select>

            <select
              value={statusId}
              onChange={(e) => { setStatusId(e.target.value); setPage(1); }}
              className="bg-[#1e293b] border border-[#1e293b] text-slate-200 text-xs rounded px-3 py-2 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="1">Active / Registered</option>
              <option value="2">Under Investigation</option>
              <option value="3">Chargesheet Filed</option>
              <option value="4">Case Closed</option>
            </select>
          </div>
        </div>

        {/* Grid List Table */}
        <div className="flex-1 min-h-0">
          <DataTable
            columns={columns}
            data={listData?.data || []}
            loading={isListLoading}
            onRowClick={(row) => navigate(`/cases/${row.CaseMasterID}`)}
            meta={listData?.meta}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // CASE DETAIL INTELLIGENCE VIEW
  // ----------------------------------------------------
  if (isDetailsLoading) {
    return <div className="text-center py-12 text-slate-500 font-mono">Decrypting Case File Metadata...</div>;
  }

  if (!caseDetails) {
    return <div className="text-center py-12 text-red-400 font-mono">Case file not found or access denied.</div>;
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: FileText },
    { id: "people", label: "People / Accused", icon: User },
    { id: "evidence", label: "Evidence & Witnesses", icon: Package },
    { id: "ai", label: "AI Threat & Risk", icon: Shield },
    { id: "network", label: "Network Graph", icon: Share2 },
    { id: "timeline", label: "Smart Timeline", icon: Clock },
    { id: "similar", label: "Similar Cases", icon: FolderOpen },
  ];

  return (
    <div className="space-y-6 select-none h-full flex flex-col">
      {/* Header Info */}
      <div className="flex justify-between items-start border-b border-[#1e293b] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              Priority: {caseDetails.InvestigationPriority || "Medium"}
            </span>
            <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              Sensitivity: {caseDetails.CaseSensitivity || "Standard"}
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 mt-2 flex items-center gap-2">
            Case Details: <span className="font-mono text-blue-400 font-extrabold">{caseDetails.CaseNo}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Crime incident logs registered under Major Head {caseDetails.CrimeMajorHeadID}</p>
        </div>

        <button
          onClick={() => navigate("/cases")}
          className="text-xs border border-slate-700 hover:border-slate-500 text-slate-300 px-3 py-1.5 rounded transition-colors"
        >
          Back to Registry
        </button>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-[#1e293b] gap-2 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors focus:outline-none ${
                activeSubTab === t.id
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels content */}
      <div className="flex-1 overflow-auto min-h-0 bg-[#0d1322] border border-[#1e293b] rounded p-6">
        {/* OVERVIEW PANEL */}
        {activeSubTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
              <div>
                <span className="text-slate-500 uppercase tracking-wide font-mono block">Crime Register No</span>
                <span className="text-slate-200 font-bold block mt-1 font-mono">{caseDetails.CrimeNo}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase tracking-wide font-mono block">Registered Date</span>
                <span className="text-slate-200 block mt-1 font-mono">{caseDetails.CrimeRegisteredDate}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase tracking-wide font-mono block">Incident Start</span>
                <span className="text-slate-200 block mt-1 font-mono">{new Date(caseDetails.IncidentFromDate).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase tracking-wide font-mono block">GPS Coordinates</span>
                <span className="text-slate-200 block mt-1 font-mono">
                  {caseDetails.latitude.toFixed(5)}° N, {caseDetails.longitude.toFixed(5)}° E
                </span>
              </div>
            </div>

            <div className="border-t border-[#1e293b] pt-5">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                Official Brief Facts Narrative
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans bg-[#111827] border border-[#1e293b] p-4 rounded">
                {caseDetails.BriefFacts}
              </p>
            </div>
          </div>
        )}

        {/* PEOPLE PANEL */}
        {activeSubTab === "people" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 font-mono">
                Accused Profiles & Entities
              </h3>
              <div className="border border-[#1e293b] rounded bg-[#111827] overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0f1524] border-b border-[#1e293b] text-slate-400">
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Age/Gender</th>
                      <th className="px-4 py-2.5">Occupation</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b] text-slate-300">
                    {accusedData?.map((a: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-2.5 font-bold text-slate-100">{a.AccusedName}</td>
                        <td className="px-4 py-2.5">{a.AgeYear} yrs / {a.GenderID === 1 ? "M" : "F"}</td>
                        <td className="px-4 py-2.5">{a.Occupation || "Unspecified"}</td>
                        <td className="px-4 py-2.5">
                          {a.IsRepeatOffender ? (
                            <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono">
                              Repeat Offender Flag
                            </span>
                          ) : (
                            <span className="text-slate-500">First Offence</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(!accusedData || accusedData.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-center text-slate-500">No accused entities linked.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 font-mono">
                Victim Records
              </h3>
              <div className="border border-[#1e293b] rounded bg-[#111827] overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0f1524] border-b border-[#1e293b] text-slate-400">
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Age/Gender</th>
                      <th className="px-4 py-2.5">Severity</th>
                      <th className="px-4 py-2.5">Relation to Accused</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b] text-slate-300">
                    {victimsData?.map((v: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-2.5 font-bold">{v.VictimName}</td>
                        <td className="px-4 py-2.5">{v.AgeYear} yrs / {v.GenderID === 1 ? "M" : "F"}</td>
                        <td className="px-4 py-2.5">{v.InjurySeverity || "None"}</td>
                        <td className="px-4 py-2.5">{v.RelationshipToAccused || "Stranger"}</td>
                      </tr>
                    ))}
                    {(!victimsData || victimsData.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-center text-slate-500">No victim entities linked.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* EVIDENCE PANEL */}
        {activeSubTab === "evidence" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 font-mono">
                Physical & Digital Evidence Collections
              </h3>
              <div className="border border-[#1e293b] rounded bg-[#111827] overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0f1524] border-b border-[#1e293b] text-slate-400">
                      <th className="px-4 py-2.5">Item type</th>
                      <th className="px-4 py-2.5">Description</th>
                      <th className="px-4 py-2.5">Collection date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b] text-slate-300">
                    {evidenceData?.map((e: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-2.5 font-bold text-slate-100">{e.EvidenceType}</td>
                        <td className="px-4 py-2.5">{e.Description}</td>
                        <td className="px-4 py-2.5 font-mono">{new Date(e.CollectionDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {(!evidenceData || evidenceData.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-center text-slate-500">No evidence entries collected.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 font-mono">
                Witness statements
              </h3>
              <div className="space-y-3">
                {witnessesData?.map((w: any, idx: number) => (
                  <div key={idx} className="bg-[#111827] border border-[#1e293b] p-4 rounded text-xs">
                    <div className="flex justify-between items-center mb-2 border-b border-[#1e293b] pb-1.5">
                      <span className="font-bold text-blue-400">{w.WitnessName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Type: {w.WitnessType || "Fact Witness"}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed italic">"{w.StatementText}"</p>
                  </div>
                ))}
                {(!witnessesData || witnessesData.length === 0) && (
                  <div className="text-center py-6 text-slate-500 text-xs">No witness statements recorded.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI PANEL */}
        {activeSubTab === "ai" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-[#111827] border border-[#1e293b] rounded p-5 flex flex-col items-center justify-center text-center">
              <Shield className="text-red-500 mb-3" size={48} />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                AI Threat Risk Score
              </span>
              {isRiskLoading ? (
                <div className="h-10 w-24 bg-slate-800 rounded animate-pulse mt-4"></div>
              ) : (
                <>
                  <span className="text-5xl font-extrabold text-red-500 font-mono mt-4">
                    {((aiRiskData?.AIRiskScore || 0) * 100).toFixed(0)}%
                  </span>
                  <span className="text-xs font-bold uppercase text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded mt-2">
                    {aiRiskData?.RiskLevel || "MEDIUM RISK"}
                  </span>
                </>
              )}
              <p className="text-[10px] text-slate-500 mt-4 leading-normal">
                Computed by Karnataka Police Risk Engine using SHAP classification vectors.
              </p>

              <button
                disabled={backfillMutation.isPending}
                onClick={() => backfillMutation.mutate()}
                className="mt-6 w-full bg-blue-600/15 hover:bg-blue-600/35 border border-blue-500/30 text-blue-400 rounded py-2 text-[10px] font-bold uppercase tracking-wider transition-colors"
              >
                {backfillMutation.isPending ? "Backfilling Vectors..." : "Sync Embedding Space"}
              </button>
            </div>

            <div className="lg:col-span-2">
              <ExplanationCard
                factors={
                  aiRiskData?.TopRiskFactors?.map((f: any) => ({
                    name: f.FeatureName,
                    score: f.ImpactScore,
                    description: f.Description,
                  })) || []
                }
              />
            </div>
          </div>
        )}

        {/* NETWORK PANEL */}
        {activeSubTab === "network" && (
          <div className="h-[400px] border border-[#1e293b] rounded overflow-hidden relative">
            <NetworkGraphCanvas />
          </div>
        )}

        {/* TIMELINE PANEL */}
        {activeSubTab === "timeline" && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 font-mono">
              Smart Investigation Timeline logs
            </h3>
            <div className="relative pl-6 border-l border-blue-500/30 space-y-6 font-sans">
              <div className="relative">
                <span className="absolute -left-[30px] top-1.5 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-[#0d1322]"></span>
                <div className="text-xs">
                  <span className="font-bold text-slate-200">Incident Occurred</span>
                  <p className="text-slate-400 mt-1">{new Date(caseDetails.IncidentFromDate).toLocaleString()}</p>
                </div>
              </div>

              <div className="relative">
                <span className="absolute -left-[30px] top-1.5 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-[#0d1322]"></span>
                <div className="text-xs">
                  <span className="font-bold text-slate-200">Case Registered (FIR Entry)</span>
                  <p className="text-slate-400 mt-1">{caseDetails.CrimeRegisteredDate}</p>
                </div>
              </div>

              <div className="relative">
                <span className="absolute -left-[30px] top-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-[#0d1322]"></span>
                <div className="text-xs">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    Investigator Assigned
                  </span>
                  <p className="text-slate-400 mt-1">Lead officer assignment logged in operational database.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SIMILAR CASES PANEL */}
        {activeSubTab === "similar" && (
          <div className="space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-center border-b border-[#1e293b] pb-3 mb-2">
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Vector Similar Case Matches (pgvector Cosine)
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5 font-sans">
                  Calculated using sentence transformer embedding models. Select a match to trigger side-by-side analysis.
                </p>
              </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Match List Column */}
              <div className="space-y-3 overflow-y-auto pr-1">
                {isSimilarLoading ? (
                  <div className="text-center py-8 text-xs text-slate-500 font-mono">Querying vector index...</div>
                ) : !similarCasesData || similarCasesData.Matches?.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 font-mono">No similar MO matches found.</div>
                ) : (
                  similarCasesData.Matches.map((m: any, idx: number) => {
                    const getSeverityBorder = (r: any) => {
                      const priority = r.InvestigationPriority;
                      const gravity = r.GravityOffenceID;
                      const risk = r.AIRiskScore;
                      if (gravity === 1 || priority === "High" || (risk && risk >= 0.7)) {
                        return "border-l-red-500";
                      }
                      if (gravity === 2 || priority === "Medium" || (risk && risk >= 0.4)) {
                        return "border-l-amber-500";
                      }
                      return "border-l-emerald-500";
                    };

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedCompareCase(m)}
                        className={`p-3.5 rounded border border-l-4 ${getSeverityBorder(m)} transition-all cursor-pointer flex gap-4 ${
                          selectedCompareCase === m
                            ? "bg-blue-600/10 border-blue-500/50"
                            : "bg-[#111827] border-[#1e293b] hover:border-slate-700"
                        }`}
                      >
                        <div className="w-16 border-r border-[#1e293b] flex flex-col items-center justify-center text-center">
                          <span className="text-[10px] font-bold text-slate-400">Match #{idx + 1}</span>
                          <span className="text-sm font-extrabold text-blue-400 mt-1 font-mono">
                            {((m.SimilarityScore || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex-1 text-xs">
                          <span className="font-bold text-slate-200 block">Case No: {m.CaseNo || `ID #${m.CaseMasterID}`}</span>
                          <p className="text-slate-400 mt-1 line-clamp-2 italic">"{m.BriefFacts}"</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Side-by-Side Comparison Matrix */}
              <div className="bg-[#111827] border border-[#1e293b] rounded p-5 flex flex-col overflow-y-auto">
                <h4 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider mb-4 border-b border-[#1e293b] pb-2">
                  Dossier Comparison Matrix
                </h4>

                {selectedCompareCase ? (
                  <div className="space-y-4 text-xs">
                    {/* Header Similarity Indicator */}
                    <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded text-center">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Cosine Similarity Confidence</span>
                      <span className="text-2xl font-black text-blue-400 font-mono mt-1 block">
                        {((selectedCompareCase.SimilarityScore || 0) * 100).toFixed(1)}% Match
                      </span>
                    </div>

                    {/* Comparison rows */}
                    <div className="divide-y divide-[#1e293b] space-y-3.5">
                      <div className="pt-3">
                        <span className="text-slate-500 font-mono text-[10px] uppercase block mb-1">Current Case Facts</span>
                        <p className="text-slate-300 font-sans leading-relaxed bg-[#0d1322] p-2.5 rounded border border-[#1e293b]/50">
                          {caseDetails.BriefFacts}
                        </p>
                      </div>

                      <div className="pt-3">
                        <span className="text-slate-500 font-mono text-[10px] uppercase block mb-1">Compared Case Facts (Case No: {selectedCompareCase.CaseNo})</span>
                        <p className="text-slate-300 font-sans leading-relaxed bg-[#0d1322] p-2.5 rounded border border-[#1e293b]/50 italic">
                          "{selectedCompareCase.BriefFacts}"
                        </p>
                      </div>

                      {selectedCompareCase.TopFactors?.length > 0 && (
                        <div className="pt-3">
                          <span className="text-slate-500 font-mono text-[10px] uppercase block mb-1.5">Shared Modus Operandi & Features</span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedCompareCase.TopFactors.map((f: any, fIdx: number) => (
                              <span
                                key={fIdx}
                                title={f.Description}
                                className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono"
                              >
                                {f.FeatureName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 text-xs">
                    <Compass className="text-slate-600 mb-2 animate-pulse" size={24} />
                    <span>Select a matching case on the left to trigger side-by-side structural comparison.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
