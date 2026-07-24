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
  X,
  Lock,
  ArrowRight,
  Shield,
  Gavel,
  Edit3,
  Eye,
  Info
} from "lucide-react";

export default function CourtCaseMonitoring() {
  const { user } = useAuth();
  const { t, translateData } = useLanguage();
  const navigate = useNavigate();

  const roleName = user?.role?.RoleName || "Guest";
  const username = user?.Username?.toLowerCase() || "";
  const grantedScope = user?.GrantedScope || "";

  const isAdmin = roleName === "Admin" || username.includes("admin");

  // Constable to SI (Sub-Inspector): Read-Only Scope
  const isConstableToSI =
    roleName === "Constable" ||
    username.includes("suda") ||
    username.includes("constable") ||
    username.includes("asi") ||
    username.includes("hc") ||
    username.includes("psi") ||
    username.includes("si") ||
    roleName === "SHO";

  // External Agency Officers (CBI, FSL, ED): Read-Only Scope if Granted
  const isExternalOfficer =
    roleName === "ExternalAgencyOfficer" ||
    username.includes("cbi") ||
    username.includes("fsl") ||
    username.includes("ed");

  // High Command Senior Officers (PI/Inspector, DySP, SP, DIG, IGP, ADGP, DGP): Edit Permission Enabled
  const isSeniorHighCommand =
    username.includes("bharathvaj") || // DGP
    username.includes("dgp") ||
    username.includes("adgp") ||
    username.includes("igp") ||
    username.includes("digp") ||
    username.includes("sp") ||
    username.includes("verma") ||
    username.includes("ramesh") ||
    username.includes("dysp") ||
    (roleName === "SCRB_Officer" && !isAdmin);

  // EDIT PERMISSION RULE: Only Senior High Command Officers can edit court cases. Admin & Constable-SI are View-Only!
  const canEditCourtCases = isSeniorHighCommand && !isAdmin;

  // External Agency Access Enforcement: Must have grantedScope from Admin
  const isExternalAccessAllowed = !isExternalOfficer || (grantedScope && grantedScope !== "None");

  // State & Filters
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedCaseForTimeline, setSelectedCaseForTimeline] = useState<any>(null);
  const [selectedCaseForEdit, setSelectedCaseForEdit] = useState<any>(null);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editToastMessage, setEditToastMessage] = useState<string | null>(null);

  // Edit Form Fields
  const [editTrialStage, setEditTrialStage] = useState("");
  const [editNextHearingDate, setEditNextHearingDate] = useState("");
  const [editProsecutorName, setEditProsecutorName] = useState("");
  const [editWarrantStatus, setEditWarrantStatus] = useState("");
  const [editCourtOrderNote, setEditCourtOrderNote] = useState("");

  // Local Court Cases Telemetry State (Supports Live Editing)
  const [localCourtOverrides, setLocalCourtOverrides] = useState<Record<number, any>>({});

  // Fetch Cases Telemetry
  const { data: casesData, isLoading } = useQuery({
    queryKey: ["courtCasesList"],
    queryFn: () => caseService.getCases({ pageSize: 50 }),
    enabled: Boolean(isExternalAccessAllowed),
  });

  const rawCases = (casesData as any)?.items || (Array.isArray(casesData) ? casesData : []);

  // Rich Seed Court Telemetry Cases
  const seedCourtData: Record<number, any> = {
    1: {
      CourtName: "Principal District & Sessions Court, Bengaluru Urban",
      ProsecutorName: "Sri. M. K. Narayana (Public Prosecutor)",
      TrialStage: "Prosecution Evidence (PW3 Depositions)",
      NextHearingDate: "2026-07-28",
      AccusedName: "Ramesh Kumar & Syndicate",
      WarrantStatus: "Summons Served to PW3 & PW4",
      BenchName: "Hon'ble Judge H. R. Kumar",
      ChargesheetNo: "CS-88/2024 (Sec 420, 468 IPC)",
    },
    2: {
      CourtName: "JMFC Court 1st Class, Mysuru Circle",
      ProsecutorName: "Smt. Anitha Rao (Special Public Prosecutor)",
      TrialStage: "Cognizance & Charge Framing",
      NextHearingDate: "2026-07-30",
      AccusedName: "Basavaraj @ Cobra",
      WarrantStatus: "Non-Bailable Warrant (NBW) Active",
      BenchName: "Hon'ble Magistrate V. S. Murthy",
      ChargesheetNo: "CS-14/2025 (Sec 307, 353 IPC)",
    },
    3: {
      CourtName: "Special CBI & Cyber Offence Judicial Bench, Belagavi",
      ProsecutorName: "Sri. R. B. Patil (Senior Govt Advocate)",
      TrialStage: "Defense Arguments",
      NextHearingDate: "2026-08-02",
      AccusedName: "Suresh Patil & Co-Accused",
      WarrantStatus: "Bail Granted with Conditions",
      BenchName: "Hon'ble Judge S. P. Deshmukh",
      ChargesheetNo: "CS-202/2025 (Sec 66D IT Act)",
    },
    4: {
      CourtName: "Additional City Civil & Sessions Court, Kalaburagi",
      ProsecutorName: "Sri. V. S. Hegde (District Public Prosecutor)",
      TrialStage: "Judgement Reserved",
      NextHearingDate: "2026-08-05",
      AccusedName: "Gang Alpha Syndicate",
      WarrantStatus: "In Judicial Custody",
      BenchName: "Hon'ble Judge K. N. Swamy",
      ChargesheetNo: "CS-41/2024 (Sec 395, 397 IPC)",
    },
    5: {
      CourtName: "Chief Judicial Magistrate Court, Dakshina Kannada",
      ProsecutorName: "Smt. Sunita Sharma (Public Prosecutor)",
      TrialStage: "Chargesheet Submitted (Sec 173 CrPC)",
      NextHearingDate: "2026-08-08",
      AccusedName: "Mohammed Imran & Gang",
      WarrantStatus: "Court Notice Dispatched",
      BenchName: "Hon'ble Magistrate B. R. Bhat",
      ChargesheetNo: "CS-109/2025 (NDPS Sec 20b)",
    },
    6: {
      CourtName: "Commercial & Financial Crimes Tribunal, Uttara Kannada",
      ProsecutorName: "Sri. A. K. Hegde (Special Public Prosecutor)",
      TrialStage: "Cross Examination of Forensic Experts",
      NextHearingDate: "2026-08-10",
      AccusedName: "Vijay M. & Hawala Operators",
      WarrantStatus: "Asset Freeze Order Active",
      BenchName: "Hon'ble Judge M. N. Rao",
      ChargesheetNo: "CS-312/2024 (PMLA Sec 3 & 4)",
    },
  };

  const courtCases = rawCases.map((c: any, idx: number) => {
    const seed = seedCourtData[(idx % 6) + 1] || seedCourtData[1];
    const override = localCourtOverrides[c.CaseMasterID] || {};

    return {
      ...c,
      CourtName: override.CourtName || seed.CourtName,
      ProsecutorName: override.ProsecutorName || seed.ProsecutorName,
      TrialStage: override.TrialStage || seed.TrialStage,
      NextHearingDate: override.NextHearingDate || seed.NextHearingDate,
      AccusedName: override.AccusedName || c.AccusedName || seed.AccusedName,
      WarrantStatus: override.WarrantStatus || seed.WarrantStatus,
      BenchName: seed.BenchName,
      ChargesheetNo: seed.ChargesheetNo,
      CourtOrderNote: override.CourtOrderNote || "Judicial proceedings in active trial timeline.",
    };
  });

  // Filter based on Role Scope
  const scopedCases = courtCases.filter((c: any) => {
    // Constable to SI: Only show cases in trial / chargesheeted status
    if (isConstableToSI) {
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
      (stageFilter === "disposed" && (c.TrialStage.includes("Disposed") || c.TrialStage.includes("Judgement")));

    return matchesSearch && matchesStage;
  });

  // Handle Edit Submission (For Senior Officers Only)
  const handleSaveCourtEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseForEdit) return;

    setLocalCourtOverrides((prev) => ({
      ...prev,
      [selectedCaseForEdit.CaseMasterID]: {
        TrialStage: editTrialStage,
        NextHearingDate: editNextHearingDate,
        ProsecutorName: editProsecutorName,
        WarrantStatus: editWarrantStatus,
        CourtOrderNote: editCourtOrderNote,
      },
    }));

    setIsEditModalOpen(false);
    setEditToastMessage(`Trial updates saved for Case #${selectedCaseForEdit.CaseNo}`);
    setTimeout(() => setEditToastMessage(null), 4000);
  };

  // External Agency Permission Locked Screen
  if (isExternalOfficer && !isExternalAccessAllowed) {
    return (
      <div className="space-y-6 select-none max-w-4xl mx-auto pt-10 font-sans">
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
          <span className="text-[10px] text-slate-400 truncate max-w-[220px] block">{translateData(r.CourtName)}</span>
          <span className="text-[9px] text-slate-500 font-mono block">{r.ChargesheetNo}</span>
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
      header: t("Actions & Permission Scope", "ಕಾರ್ಯಾಚರಣೆ & ಅನುಮತಿ"),
      accessorKey: "CaseMasterID",
      render: (r: any) => (
        <div className="flex items-center gap-2">
          {/* Read Only View Timeline Button (Available to All Roles) */}
          <button
            onClick={() => {
              setSelectedCaseForTimeline(r);
              setIsTimelineModalOpen(true);
            }}
            className="flex items-center gap-1 bg-[#1e293b] hover:bg-[#334155] text-slate-300 border border-slate-700 px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all"
          >
            <Eye size={12} />
            <span>{t("View Timeline", "ಟೈಮ್‌ಲೈನ್ ವೀಕ್ಷಿಸಿ")}</span>
          </button>

          {/* Edit Button (Restricted strictly to Senior High Command Officers: DySP, SP, DIG, IGP, ADGP, DGP) */}
          {canEditCourtCases ? (
            <button
              onClick={() => {
                setSelectedCaseForEdit(r);
                setEditTrialStage(r.TrialStage);
                setEditNextHearingDate(r.NextHearingDate);
                setEditProsecutorName(r.ProsecutorName);
                setEditWarrantStatus(r.WarrantStatus);
                setEditCourtOrderNote(r.CourtOrderNote || "");
                setIsEditModalOpen(true);
              }}
              className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all"
            >
              <Edit3 size={12} />
              <span>{t("Update Trial", "ಅಪ್‌ಡೇಟ್")}</span>
            </button>
          ) : (
            <span className="text-[10px] text-slate-500 font-mono italic">
              {t("(View Only)", "(ವೀಕ್ಷಣೆ ಮಾತ್ರ)")}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 select-none font-sans pb-10">
      {/* Edit Toast Alert */}
      {editToastMessage && (
        <div className="fixed top-5 right-5 bg-emerald-600 text-white font-mono text-xs px-4 py-2.5 rounded-lg shadow-2xl z-50 flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <CheckCircle size={16} />
          <span>{editToastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#1e293b] pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2 uppercase tracking-widest font-mono">
              <Scale className="text-blue-500" size={24} />
              {t("Court Case Monitoring Portal", "ನ್ಯಾಯಾಲಯ ಪ್ರಕರಣಗಳ ಮೇಲ್ವಿಚಾರಣೆ ಪೋರ್ಟಲ್")}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <Info size={13} className="text-blue-400 flex-shrink-0" />
            <span>
              {t(
                "Court cases are automatically ingested from chargesheeted FIR records. Direct court case registration is disabled for all roles.",
                "ಚಾರ್ಜ್‌ಶೀಟ್ ಸಲ್ಲಿಸಿದ ಎಫ್.ಐ.ಆರ್ ಪ್ರಕರಣಗಳನ್ನು ನ್ಯಾಯಾಲಯದ ಪೋರ್ಟಲ್‌ಗೆ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ದಾಖಲಿಸಲಾಗುತ್ತದೆ. ನೇರ ನೋಂದಣಿ ಆಯ್ಕೆ ಅಮಾನ್ಯಗೊಳಿಸಲಾಗಿದೆ."
              )}
            </span>
          </p>
        </div>

        {/* Role & Scope Indicator Badge */}
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-2">
              <Shield size={14} />
              <span>🛡️ {t("Admin Supervisory Scope (View Only)", "ಆಡಳಿತಾಧಿಕಾರಿ ವೀಕ್ಷಣೆ ಪ್ರವೇಶ (ಸೀಮಿತ ವೀಕ್ಷಣೆ)")}</span>
            </div>
          ) : isConstableToSI ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-2">
              <Shield size={14} />
              <span>👮 {t("Constable to SI Scope (View Only)", "ಕಾನ್ಸ್‌ಟೇಬಲ್ - ಪಿಎಸ್‌ಐ ವೀಕ್ಷಣೆ ಪ್ರವೇಶ (ಸೀಮಿತ ವೀಕ್ಷಣೆ)")}</span>
            </div>
          ) : canEditCourtCases ? (
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-2">
              <Scale size={14} />
              <span>⚖️ {t("Senior Officer Command Scope (Edit Authorized)", "ಹಿರಿಯ ಅಧಿಕಾರಿ ಸೀಮೆ (ಅಪ್‌ಡೇಟ್ ಮಾಡಲು ಅನುಮೋದಿತ)")}</span>
            </div>
          ) : (
            <div className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-2">
              <Building size={14} />
              <span>🏢 {t("Authorized External Agency Scope (View Only)", "ಅನುಮೋದಿತ ಸಂಸ್ಥೆ ನ್ಯಾಯಾಲಯ ವೀಕ್ಷಣೆ")}</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          title={t("Cases in Judicial Trial", "ನ್ಯಾಯಾಲಯದ ಸಕ್ರಿಯ ವಿಚಾರಣೆ ಪ್ರಕರಣಗಳು")}
          value={filteredCases.length}
          icon={<Gavel size={16} />}
          badges={[{ label: isConstableToSI ? t("Precinct View Only", "ಠಾಣಾ ವೀಕ್ಷಣೆ") : t("Statewide View", "ರಾಜ್ಯ ವೀಕ್ಷಣೆ"), type: "neutral" }]}
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
          value={filteredCases.filter((c: any) => c.WarrantStatus.includes("Warrant")).length}
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
            <option value="disposed">✅ {t("Judgement / Disposed", "ತೀರ್ಪು ಪೂರ್ಣಗೊಂಡಿದೆ")}</option>
          </select>
        </div>
      </div>

      {/* Main Cases Table */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 flex flex-col h-[480px] shadow-xl">
        <div className="flex justify-between items-center mb-4 border-b border-[#1e293b] pb-3">
          <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider flex items-center gap-2">
            <Building size={16} className="text-blue-400" />
            <span>
              {isConstableToSI
                ? t("PRECINCT TRIAL MONITORING (CONSTABLE TO SI VIEW ONLY)", "ಠಾಣಾ ಮಟ್ಟದ ನ್ಯಾಯಾಲಯ ಪ್ರಕರಣಗಳು (ಕಾನ್ಸ್‌ಟೇಬಲ್ - ಪಿಎಸ್‌ಐ ಸೀಮಿತ ವೀಕ್ಷಣೆ)")
                : isAdmin
                ? t("ADMIN SUPERVISORY JUDICIAL MONITORING (VIEW ONLY)", "ಆಡಳಿತಾಧಿಕಾರಿ ನ್ಯಾಯಾಲಯ ಮೇಲ್ವಿಚಾರಣೆ (ಸೀಮಿತ ವೀಕ್ಷಣೆ)")
                : t("STATEWIDE JUDICIAL TRIAL REGISTRY (SENIOR COMMAND EDIT ENABLED)", "ರಾಜ್ಯಮಟ್ಟದ ನ್ಯಾಯಾಲಯ ವಿಚಾರಣೆಗಳ ರಿಜಿಸ್ಟ್ರಿ (ಅಪ್‌ಡೇಟ್ ಸಕ್ರಿಯಗೊಳಿಸಲಾಗಿದೆ)")}
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

      {/* Read-Only Judicial Trial Timeline Modal */}
      {isTimelineModalOpen && selectedCaseForTimeline && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 select-none font-sans">
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

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
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
                  <span className="text-[10px] text-slate-500 uppercase block">{t("Bench:", "ಪೀಠ:")}</span>
                  <span className="text-slate-300 font-bold">{selectedCaseForTimeline.BenchName}</span>
                </div>
              </div>

              {/* Progress Stepper */}
              <div className="space-y-4 relative border-l-2 border-blue-500/30 ml-4 pl-6">
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0f172a] flex items-center justify-center text-[9px] text-black font-bold">
                    ✓
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold block">1. FIR & Incident Brief Registered</span>
                    <p className="text-slate-300 text-xs mt-0.5">{translateData(selectedCaseForTimeline.BriefFacts)}</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0f172a] flex items-center justify-center text-[9px] text-black font-bold">
                    ✓
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold block">2. Investigation & Chargesheet Filed ({selectedCaseForTimeline.ChargesheetNo})</span>
                    <p className="text-slate-400 text-xs mt-0.5">Submitted under Section 173 CrPC to Magistrate Court.</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-[#0f172a] flex items-center justify-center text-[9px] text-white font-bold animate-pulse">
                    ▶
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-400 font-mono font-bold block">3. Current Stage: {translateData(selectedCaseForTimeline.TrialStage)}</span>
                    <p className="text-slate-300 text-xs mt-0.5">
                      Public Prosecutor <span className="text-amber-400 font-bold">{translateData(selectedCaseForTimeline.ProsecutorName)}</span> conducting judicial proceedings.
                    </p>
                    <p className="text-slate-400 text-[11px] italic mt-1 bg-[#111827] border border-[#1e293b] p-2 rounded">
                      "{selectedCaseForTimeline.CourtOrderNote}"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#1e293b] flex justify-end bg-[#111827] rounded-b-xl">
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

      {/* Edit Trial Stage Modal (Restricted strictly to Senior High Command Officers) */}
      {isEditModalOpen && selectedCaseForEdit && canEditCourtCases && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSaveCourtEdit}
            className="bg-[#0f172a] border border-amber-500/30 rounded-xl max-w-lg w-full flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 select-none font-sans"
          >
            <div className="p-5 border-b border-[#1e293b] flex justify-between items-center bg-[#111827] rounded-t-xl">
              <div className="flex items-center gap-2">
                <Edit3 className="text-amber-400" size={18} />
                <h3 className="text-sm font-bold text-slate-100 font-mono">
                  {t("Update Judicial Trial Telemetry:", "ನ್ಯಾಯಾಲಯ ತನಿಖೆ ಅಪ್‌ಡೇಟ್:")} {selectedCaseForEdit.CaseNo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-[#1e293b] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-sans">
              <div>
                <label className="text-slate-400 font-mono block mb-1">{t("Trial Stage:", "ವಿಚಾರಣೆ ಹಂತ:")}</label>
                <select
                  value={editTrialStage}
                  onChange={(e) => setEditTrialStage(e.target.value)}
                  className="w-full bg-[#1e293b] border border-[#334155] text-slate-200 text-xs rounded px-3 py-2 focus:outline-none focus:border-amber-500 font-mono font-bold"
                >
                  <option value="Chargesheet Submitted (Sec 173 CrPC)">Chargesheet Submitted (Sec 173 CrPC)</option>
                  <option value="Cognizance & Charge Framing">Cognizance & Charge Framing</option>
                  <option value="Prosecution Evidence (PW Stage)">Prosecution Evidence (PW Stage)</option>
                  <option value="Cross Examination & Arguments">Cross Examination & Arguments</option>
                  <option value="Judgement Reserved">Judgement Reserved</option>
                  <option value="Convicted / Disposed">Convicted / Disposed</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-mono block mb-1">{t("Next Hearing Date:", "ಮುಂದಿನ ವಿಚಾರಣೆ ದಿನಾಂಕ:")}</label>
                <input
                  type="date"
                  value={editNextHearingDate}
                  onChange={(e) => setEditNextHearingDate(e.target.value)}
                  className="w-full bg-[#1e293b] border border-[#334155] text-slate-200 text-xs rounded px-3 py-2 focus:outline-none focus:border-amber-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 font-mono block mb-1">{t("Assigned Prosecutor:", "ಸರ್ಕಾರಿ ಅಭಿಯೋಜಕರು:")}</label>
                <input
                  type="text"
                  value={editProsecutorName}
                  onChange={(e) => setEditProsecutorName(e.target.value)}
                  className="w-full bg-[#1e293b] border border-[#334155] text-slate-200 text-xs rounded px-3 py-2 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-mono block mb-1">{t("Warrant / Summons Status:", "ವಾರಂಟ್ / ಸಮನ್ಸ್ ಸ್ಥಿತಿ:")}</label>
                <select
                  value={editWarrantStatus}
                  onChange={(e) => setEditWarrantStatus(e.target.value)}
                  className="w-full bg-[#1e293b] border border-[#334155] text-slate-200 text-xs rounded px-3 py-2 focus:outline-none focus:border-amber-500 font-mono font-bold"
                >
                  <option value="Summons Served to PW Witnesses">Summons Served to PW Witnesses</option>
                  <option value="Non-Bailable Warrant (NBW) Active">Non-Bailable Warrant (NBW) Active</option>
                  <option value="Bail Granted with Conditions">Bail Granted with Conditions</option>
                  <option value="In Judicial Custody">In Judicial Custody</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-mono block mb-1">{t("Court Order / Trial Note:", "ನ್ಯಾಯಾಲಯದ ಆದೇಶ / ಟಿಪ್ಪಣಿ:")}</label>
                <textarea
                  rows={3}
                  value={editCourtOrderNote}
                  onChange={(e) => setEditCourtOrderNote(e.target.value)}
                  placeholder="Enter magistrate direction or trial proceedings summary..."
                  className="w-full bg-[#1e293b] border border-[#334155] text-slate-200 text-xs rounded p-3 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#1e293b] flex justify-end gap-3 bg-[#111827] rounded-b-xl">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="bg-[#1e293b] hover:bg-[#334155] text-slate-300 text-xs px-4 py-2 rounded font-mono font-bold transition-colors"
              >
                {t("Cancel", "ರದ್ದುಗೊಳಿಸಿ")}
              </button>
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white font-mono text-xs px-5 py-2 rounded font-bold transition-all shadow-lg shadow-amber-600/30"
              >
                {t("Save Updates", "ಸೇವ್ ಮಾಡಿ")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
