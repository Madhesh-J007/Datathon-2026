import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { caseService } from "../../services/caseService";
import { useAuth } from "../../app/providers/AuthProvider";
import { useLanguage } from "../../app/providers/LanguageContext";
import DataTable from "../../components/common/DataTable";
import KpiCard from "../../components/common/KpiCard";
import {
  Scale,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Building,
  PlusCircle,
  X,
  Lock,
  ArrowRight,
  Shield,
  Gavel
} from "lucide-react";

export default function CourtCaseMonitoring() {
  const { user } = useAuth();
  const { t, translateData } = useLanguage();
  const navigate = useNavigate();

  const roleName = user?.role?.RoleName || "Guest";
  const username = user?.Username?.toLowerCase() || "";
  const grantedScope = user?.GrantedScope || "";

  const isAdmin = roleName === "Admin" || username.includes("admin");
  const isSeniorOfficer =
    isAdmin ||
    roleName === "SCRB_Officer" ||
    roleName === "SHO" ||
    username.includes("sp") ||
    username.includes("dgp") ||
    username.includes("igp") ||
    username.includes("dysp") ||
    username.includes("verma") ||
    username.includes("ramesh");

  const isExternalOfficer =
    roleName === "ExternalAgencyOfficer" ||
    username.includes("cbi") ||
    username.includes("fsl") ||
    username.includes("ed");

  const isConstableToASI = !isSeniorOfficer && !isExternalOfficer;

  // External Agency Access Enforcement: Must have grantedScope from Admin
  const isExternalAccessAllowed = !isExternalOfficer || (grantedScope && grantedScope !== "None");

  // State & Filters
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedCaseForTimeline, setSelectedCaseForTimeline] = useState<any>(null);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);

  // Fetch Cases Telemetry
  const { data: casesData, isLoading } = useQuery({
    queryKey: ["courtCasesList"],
    queryFn: () => caseService.getCases({ pageSize: 50 }),
    enabled: Boolean(isExternalAccessAllowed),
  });

  const rawCases = (casesData as any)?.items || (Array.isArray(casesData) ? casesData : []);

  // Mock enhancement for Court Telemetry
  const courtCases = rawCases.map((c: any, idx: number) => {
    const stages = [
      "Chargesheet Filed (Sec 173 CrPC)",
      "Cognizance Taken by Magistrate",
      "Prosecution Evidence (PW Stage)",
      "Cross Examination & Arguments",
      "Judgement Reserved",
      "Convicted / Disposed"
    ];
    const courts = [
      "Principal District & Sessions Court, Bengaluru",
      "JMFC Court 1st Class, Mysuru",
      "Special CBI & NDPS Judicial Bench, Belagavi",
      "Additional City Civil & Sessions Court, Kalaburagi",
      "Chief Judicial Magistrate Court, Dakshina Kannada"
    ];
    const prosecutors = [
      "Sri. M. K. Narayana (Public Prosecutor)",
      "Smt. Anitha Rao (Special Public Prosecutor)",
      "Sri. R. B. Patil (Senior Govt Advocate)",
      "Sri. V. S. Hegde (District Public Prosecutor)"
    ];

    const stage = stages[idx % stages.length];
    const courtName = courts[idx % courts.length];
    const prosecutor = prosecutors[idx % prosecutors.length];
    const nextHearingDate = new Date(Date.now() + (idx * 2 + 1) * 86400000).toISOString().split("T")[0];

    return {
      ...c,
      CourtName: courtName,
      ProsecutorName: prosecutor,
      TrialStage: stage,
      NextHearingDate: nextHearingDate,
      AccusedName: c.AccusedName || `Accused #${100 + idx}`,
      WarrantStatus: idx % 3 === 0 ? "Summons Served" : "Warrant Active",
    };
  });

  // Filter based on Role Scope
  const scopedCases = courtCases.filter((c: any) => {
    // Constable to ASI: Only show cases in trial / chargesheeted status
    if (isConstableToASI) {
      return c.CaseStatusID === 3 || c.CaseStatusID === 4 || c.TrialStage.includes("Prosecution") || c.TrialStage.includes("Chargesheet");
    }
    return true;
  });

  // Filter by search & stage
  const filteredCases = scopedCases.filter((c: any) => {
    const matchesSearch =
      !search ||
      c.CaseNo?.toLowerCase().includes(search.toLowerCase()) ||
      c.CourtName?.toLowerCase().includes(search.toLowerCase()) ||
      c.BriefFacts?.toLowerCase().includes(search.toLowerCase());

    const matchesStage =
      stageFilter === "all" ||
      (stageFilter === "chargesheet" && c.TrialStage.includes("Chargesheet")) ||
      (stageFilter === "evidence" && c.TrialStage.includes("Evidence")) ||
      (stageFilter === "arguments" && c.TrialStage.includes("Arguments")) ||
      (stageFilter === "disposed" && c.TrialStage.includes("Disposed"));

    return matchesSearch && matchesStage;
  });

  // If External Officer has no Admin Approval: Show Access Locked Card
  if (isExternalOfficer && !isExternalAccessAllowed) {
    return (
      <div className="space-y-6 select-none max-w-4xl mx-auto pt-10">
        <div className="bg-[#111827] border border-amber-500/30 rounded-xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Lock size={32} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wider font-mono">
              {t("INTER-AGENCY COURT ACCESS RESTRICTED", "ಸಂಸ್ಥೆಗಳ ಮಧ್ಯದ ನ್ಯಾಯಾಲಯ ವೀಕ್ಷಣೆ ಪ್ರವೇಶ ನಿರ್ಬಂಧಿಸಲಾಗಿದೆ")}
            </h2>
            <p className="text-xs text-slate-400 max-w-xl mx-auto mt-2 leading-relaxed">
              {t(
                "Access to Judicial Trial Telemetry & Court Case Timelines is restricted for External Agency Officers (CBI / FSL / ED). Administrator authorization is required.",
                "ನ್ಯಾಯಾಲಯದ ವಿಚಾರಣೆ ಮತ್ತು ಕೇಸ್ ಟೈಮ್‌ಲೈನ್ ವೀಕ್ಷಿಸಲು ಕರಾರುವಾಕ್ ಆಡಳಿತಾಧಿಕಾರಿಗಳ (Admin) ಅನುಮೋದನೆ ಅಗತ್ಯವಿದೆ."
              )}
            </p>
          </div>

          <div className="bg-[#0b0f19] border border-[#1e293b] rounded p-4 max-w-md mx-auto text-left text-xs font-mono space-y-2">
            <div className="flex justify-between text-slate-400">
              <span>{t("Officer Identifier:", "ಅಧಿಕಾರಿ ಐಡಿ:")}</span>
              <span className="text-amber-400 font-bold">{user?.Username}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>{t("Agency Assigned:", "ಸಂಸ್ಥೆ:")}</span>
              <span className="text-slate-200">{roleName}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>{t("Authorization Scope:", "ಅನುಮೋದಿತ ಶ್ರೇಣಿ:")}</span>
              <span className="text-red-400 font-bold">Unassigned / Pending</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => navigate("/collaboration")}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs px-5 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-blue-600/30"
            >
              <Shield size={16} />
              <span>{t("Request Admin Authorization in Vault", "ಆಡಳಿತಾಧಿಕಾರಿಯಿಂದ ಪ್ರವೇಶ ಅನುಮೋದನೆ ಕೋರಿ")}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const columns = [
    {
      header: t("Case No & Court", "ಪ್ರಕರಣ ಸಂಖ್ಯೆ & ನ್ಯಾಯಾಲಯ"),
      accessorKey: "CaseNo",
      render: (r: any) => (
        <div>
          <span className="text-blue-400 font-bold font-mono text-xs block">{r.CaseNo}</span>
          <span className="text-[10px] text-slate-400 truncate max-w-[200px] block">{translateData(r.CourtName)}</span>
        </div>
      ),
    },
    {
      header: t("District / Precinct", "ಜಿಲ್ಲೆ / ಠಾಣಾ ವ್ಯಾಪ್ತಿ"),
      accessorKey: "DistrictID",
      render: (r: any) => (
        <span className="text-xs text-slate-300 font-mono">
          {translateData(r.PoliceStationName || `District Unit #${r.DistrictID}`)}
        </span>
      ),
    },
    {
      header: t("Trial Stage & Progress", "ವಿಚಾರಣೆ ಹಂತ & ಪ್ರಗತಿ"),
      accessorKey: "TrialStage",
      render: (r: any) => (
        <div>
          <span className="inline-block bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
            {translateData(r.TrialStage)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">{r.WarrantStatus}</span>
        </div>
      ),
    },
    {
      header: t("Public Prosecutor", "ಸರ್ಕಾರಿ ಅಭಿಯೋಜಕರು"),
      accessorKey: "ProsecutorName",
      render: (r: any) => <span className="text-xs text-slate-300 font-sans">{translateData(r.ProsecutorName)}</span>,
    },
    {
      header: t("Next Hearing Date", "ಮುಂದಿನ ವಿಚಾರಣೆ ದಿನಾಂಕ"),
      accessorKey: "NextHearingDate",
      render: (r: any) => (
        <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400 font-bold">
          <Calendar size={13} />
          <span>{r.NextHearingDate}</span>
        </div>
      ),
    },
    {
      header: t("Actions", "ಕಾರ್ಯಾಚರಣೆ"),
      accessorKey: "CaseMasterID",
      render: (r: any) => (
        <button
          onClick={() => {
            setSelectedCaseForTimeline(r);
            setIsTimelineModalOpen(true);
          }}
          className="flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all"
        >
          <Gavel size={12} />
          <span>{t("Trial Timeline", "ವಿಚಾರಣೆ ಟೈಮ್‌ಲೈನ್")}</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 select-none font-sans pb-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#1e293b] pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2 uppercase tracking-widest font-mono">
              <Scale className="text-blue-500" size={24} />
              {t("Court Case Monitoring Portal", "ನ್ಯಾಯಾಲಯ ಪ್ರಕರಣಗಳ ಮೇಲ್ವಿಚಾರಣೆ ಪೋರ್ಟಲ್")}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t(
              "Judicial trial telemetry, court hearing schedules, prosecution timelines, and warrant summons tracking.",
              "ನ್ಯಾಯಾಲಯದ ವಿಚಾರಣೆ ಟೆಲಿಮೆಟ್ರಿ, ಮುಂಬರುವ ದಿನಾಂಕಗಳು, ಸರ್ಕಾರಿ ಅಭಿಯೋಜಕರ ವರದಿ ಮತ್ತು ಸಮನ್ಸ್ ನಿರ್ವಹಣೆ."
            )}
          </p>
        </div>

        {/* Role & Scope Indicator Badge */}
        <div className="flex items-center gap-3">
          {isConstableToASI ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-2">
              <Shield size={14} />
              <span>👮 {t("Constable-ASI Precinct Trial Scope", "ಕಾನ್ಸ್‌ಟೇಬಲ್ - ಎಎಸ್‌ಐ ಠಾಣಾ ವಿಚಾರಣೆ ಸೀಮೆ")}</span>
            </div>
          ) : isSeniorOfficer ? (
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-2">
              <Scale size={14} />
              <span>⚖️ {t("SI to DGP Judicial Command Scope", "ಎಸ್‌ಐ - ಡಿಜಿಪಿ ರಾಜ್ಯಮಟ್ಟದ ನ್ಯಾಯಾಲಯ ಶ್ರೇಣಿ")}</span>
            </div>
          ) : (
            <div className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-2">
              <Building size={14} />
              <span>🏢 {t("Authorized External Agency Scope", "ಅನುಮೋದಿತ ಸಂಸ್ಥೆ ನ್ಯಾಯಾಲಯ ಸೀಮೆ")}</span>
            </div>
          )}

          {isAdmin && (
            <button
              onClick={() => alert(t("Admin Master Action: Court Hearing Sync initiated.", "ಆಡಳಿತಾಧಿಕಾರಿ ಕ್ರಮ: ನ್ಯಾಯಾಲಯ ದಿನಾಂಕ ಸಿಂಕ್ ಮಾಡಲಾಗಿದೆ."))}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded transition-colors font-mono"
            >
              <PlusCircle size={14} />
              <span>{t("Schedule Court Date", "ನ್ಯಾಯಾಲಯ ದಿನಾಂಕ ನಿಗದಿಪಡಿಸಿ")}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          title={t("Cases in Judicial Trial", "ನ್ಯಾಯಾಲಯದ ಸಕ್ರಿಯ ವಿಚಾರಣೆ ಪ್ರಕರಣಗಳು")}
          value={filteredCases.length}
          icon={<Gavel size={16} />}
          badges={[{ label: isConstableToASI ? t("Precinct Scope", "ಠಾಣಾ ಸೀಮೆ") : t("Statewide Scope", "ರಾಜ್ಯ ಸೀಮೆ"), type: "neutral" }]}
          description={t("Active dossiers currently under judicial court proceedings.", "ನ್ಯಾಯಾಲಯದ ವಿಚಾರಣೆಯಲ್ಲಿರುವ ಒಟ್ಟು ಸಕ್ರಿಯ ಪ್ರಕರಣಗಳು.")}
        />
        <KpiCard
          title={t("Upcoming Court Hearings", "ಮುಂಬರುವ ವಿಚಾರಣೆ ದಿನಾಂಕಗಳು")}
          value={filteredCases.filter((c: any) => new Date(c.NextHearingDate) <= new Date(Date.now() + 7 * 86400000)).length}
          icon={<Calendar size={16} />}
          badges={[{ label: t("Next 7 Days", "ಮುಂದಿನ ೭ ದಿನಗಳು"), type: "warning" }]}
          description={t("Court hearing dates scheduled within 7 days.", "ಮುಂದಿನ ೭ ದಿನಗಳಲ್ಲಿ ವಿಚಾರಣೆಗೆ ನಿಗದಿಯಾದ ಪ್ರಕರಣಗಳು.")}
        />
        <KpiCard
          title={t("Prosecution Conviction Rate", "ಸರ್ಕಾರಿ ಅಭಿಯೋಜನೆ ಶಿಕ್ಷೆಯ ಪ್ರಮಾಣ")}
          value="78.4%"
          icon={<CheckCircle size={16} />}
          badges={[{ label: "+4.2% YoY", type: "success" }]}
          description={t("Judicial conviction and trial completion metric.", "ನ್ಯಾಯಾಲಯದಲ್ಲಿ ದೋಷಾರೋಪಣೆ ಪೂರ್ಣಗೊಂಡ ಯಶಸ್ಸಿನ ಪ್ರಮಾಣ.")}
        />
        <KpiCard
          title={t("Active Summons & Warrants", "ಸಕ್ರಿಯ ಸಮನ್ಸ್ & ವಾರಂಟ್‌ಗಳು")}
          value={filteredCases.filter((c: any) => c.WarrantStatus === "Warrant Active").length}
          icon={<AlertTriangle size={16} />}
          badges={[{ label: t("Immediate Execution", "ತಕ್ಷಣ ಜಾರಿಗೊಳಿಸಿ"), type: "error" }]}
          description={t("Witness summons & judicial warrants pending execution.", "ಜಾರಿಗೊಳಿಸಲು ಬಾಕಿ ಇರುವ ಕೋರ್ಟ್ ವಾರಂಟ್‌ಗಳು.")}
        />
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="flex-1 w-full sm:w-auto">
          <input
            type="text"
            placeholder={t("Search by Case No, Court Bench, Prosecutor...", "ಪ್ರಕರಣದ ಸಂಖ್ಯೆ, ನ್ಯಾಯಾಲಯದ ಪೀಠ, ಅಭಿಯೋಜಕರ ಹೆಸರು ಶೋಧಿಸಿ...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1e293b] border border-[#334155] text-slate-200 text-xs rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 font-sans"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="bg-[#1e293b] border border-[#334155] text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none font-mono font-bold"
          >
            <option value="all">⚖️ {t("All Trial Stages", "ಎಲ್ಲಾ ವಿಚಾರಣಾ ಹಂತಗಳು")}</option>
            <option value="chargesheet">📜 {t("Chargesheet Filed", "ಚಾರ್ಜ್‌ಶೀಟ್ ಸಲ್ಲಿಸಲಾಗಿದೆ")}</option>
            <option value="evidence">🔍 {t("Prosecution Evidence", "ಸಾಕ್ಷ್ಯ ವಿಚಾರಣೆ ಹಂತ")}</option>
            <option value="arguments">🗣️ {t("Final Arguments", "ಅಂತಿಮ ವಾದ-ವಿವಾದ")}</option>
            <option value="disposed">✅ {t("Disposed / Convicted", "ತೀರ್ಪು ಪೂರ್ಣಗೊಂಡಿದೆ")}</option>
          </select>
        </div>
      </div>

      {/* Main Cases Table */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 flex flex-col h-[480px] shadow-xl">
        <div className="flex justify-between items-center mb-4 border-b border-[#1e293b] pb-3">
          <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider flex items-center gap-2">
            <Building size={16} className="text-blue-400" />
            <span>
              {isConstableToASI
                ? t("PRECINCT TRIAL WATCH LIST", "ಠಾಣಾ ಮಟ್ಟದ ನ್ಯಾಯಾಲಯದ ಸಕ್ರಿಯ ಪ್ರಕರಣಗಳು")
                : t("STATEWIDE JUDICIAL TRIAL REGISTRY", "ರಾಜ್ಯಮಟ್ಟದ ನ್ಯಾಯಾಲಯ ವಿಚಾರಣೆಗಳ ರಿಜಿಸ್ಟ್ರಿ")}
            </span>
          </h3>
          <span className="text-[10px] text-slate-400 font-mono bg-[#1e293b] px-2.5 py-1 rounded">
            {filteredCases.length} {t("Dossiers Listed", "ಪ್ರಕರಣಗಳು ಪಟ್ಟಿಮಾಡಲಾಗಿದೆ")}
          </span>
        </div>

        <div className="flex-1 min-h-0">
          <DataTable columns={columns} data={filteredCases} loading={isLoading} />
        </div>
      </div>

      {/* Judicial Trial Timeline Modal */}
      {isTimelineModalOpen && selectedCaseForTimeline && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#1e293b] flex justify-between items-center bg-[#111827] rounded-t-xl">
              <div className="flex items-center gap-2">
                <Gavel className="text-blue-400" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-mono">
                    {t("Judicial Trial Timeline:", "ನ್ಯಾಯಾಲಯ ವಿಚಾರಣೆ ಕಾಲಾನುಕ್ರಮ:")} {selectedCaseForTimeline.CaseNo}
                  </h3>
                  <p className="text-[11px] text-slate-400">{translateData(selectedCaseForTimeline.CourtName)}</p>
                </div>
              </div>
              <button
                onClick={() => setIsTimelineModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-[#1e293b] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#111827] border border-[#1e293b] p-3.5 rounded-lg font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">{t("Accused Entity:", "ಆರೋಪಿ:")}</span>
                  <span className="text-slate-200 font-bold">{selectedCaseForTimeline.AccusedName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">{t("Next Hearing:", "ಮುಂದಿನ ವಿಚಾರಣೆ:")}</span>
                  <span className="text-amber-400 font-bold">{selectedCaseForTimeline.NextHearingDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">{t("Current Stage:", "ಪ್ರಸ್ತುತ ಹಂತ:")}</span>
                  <span className="text-purple-400 font-bold">{translateData(selectedCaseForTimeline.TrialStage)}</span>
                </div>
              </div>

              {/* Chronological Timeline Progression */}
              <div className="space-y-4 relative border-l-2 border-blue-500/30 ml-4 pl-6">
                {/* Step 1 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0f172a] flex items-center justify-center text-[9px] text-black font-bold">
                    ✓
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold block">1. FIR & Telemetry Registered</span>
                    <p className="text-slate-300 text-xs mt-0.5">{translateData(selectedCaseForTimeline.BriefFacts)}</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0f172a] flex items-center justify-center text-[9px] text-black font-bold">
                    ✓
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold block">2. Investigation & Chargesheet Filed (Sec 173 CrPC)</span>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Submitted by Investigating Officer to Judicial Magistrate Court.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-[#0f172a] flex items-center justify-center text-[9px] text-white font-bold animate-pulse">
                    ▶
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-400 font-mono font-bold block">3. Current Judicial Trial Stage: {translateData(selectedCaseForTimeline.TrialStage)}</span>
                    <p className="text-slate-300 text-xs mt-0.5">
                      Public Prosecutor <span className="text-amber-400 font-bold">{translateData(selectedCaseForTimeline.ProsecutorName)}</span> conducting active examination.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-slate-700 border-2 border-[#0f172a]"></div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono block">4. Final Defense Arguments & Judicial Pronouncement</span>
                    <p className="text-slate-500 text-xs mt-0.5">Awaiting completion of witness depositions.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#1e293b] flex justify-end gap-3 bg-[#111827] rounded-b-xl">
              <button
                onClick={() => setIsTimelineModalOpen(false)}
                className="bg-[#1e293b] hover:bg-[#334155] text-slate-300 text-xs px-4 py-2 rounded font-mono font-bold transition-colors"
              >
                {t("Close Window", "ಮುಚ್ಚಿ")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
