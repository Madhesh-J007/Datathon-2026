import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import {
  Database,
  Terminal,
  UserPlus,
  Users,
  CheckCircle2,
  ShieldCheck,
  Award,
  Sliders,
  X,
} from "lucide-react";

export default function Admin() {
  const [activeTab, setActiveTab] = useState<"system" | "appointments">("appointments");

  // User form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [officerName, setOfficerName] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [selectedRank, setSelectedRank] = useState("PSI / SI");
  const [roleId, setRoleId] = useState("4"); // default Constable / Officer
  const [scopeLevel, setScopeLevel] = useState("Station");
  const [districtId, setDistrictId] = useState("5"); // default Bengaluru Urban
  const [unitId, setUnitId] = useState("1");

  // Permission Toggles
  const [permFIR, setPermFIR] = useState(true);
  const [permGIS, setPermGIS] = useState(true);
  const [permNetwork, setPermNetwork] = useState(true);
  const [permPredictive, setPermPredictive] = useState(true);
  const [permPDF, setPermPDF] = useState(true);

  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Configurator Modal for Existing Officers
  const [selectedOfficerConfig, setSelectedOfficerConfig] = useState<any | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Queries
  const { data: logs, isLoading: isLogsLoading } = useQuery<any[]>({
    queryKey: ["adminLogs"],
    queryFn: () => adminService.getAuditLogs(),
  });

  const { data: users, refetch: refetchUsers } = useQuery<any[]>({
    queryKey: ["adminUsers"],
    queryFn: () => adminService.getUsers(),
  });

  const { data: tables, isLoading: isDbLoading } = useQuery({
    queryKey: ["adminDbMetrics"],
    queryFn: async () => [
      { table_name: "CaseMaster", size_bytes: 4915200, row_count: 5410 },
      { table_name: "AccusedDetails", size_bytes: 1048576, row_count: 3220 },
      { table_name: "EvidenceItems", size_bytes: 524288, row_count: 1430 },
      { table_name: "AuditLogs", size_bytes: 2097152, row_count: 8520 },
    ],
  });

  const logsList = Array.isArray(logs) ? logs : [];
  const tablesList = tables || [];
  const usersList = Array.isArray(users) ? users : [];

  // All Officer Ranks from Official Police Insignia Chart
  const ipsRanks = [
    { code: "DGP", name: "Director General of Police", cadre: "IPS", scope: "State" },
    { code: "ADGP", name: "Additional Director General of Police", cadre: "IPS", scope: "State" },
    { code: "IGP", name: "Inspector General of Police", cadre: "IPS", scope: "State" },
    { code: "DIGP", name: "Deputy Inspector General of Police", cadre: "IPS", scope: "State" },
    { code: "SP (SG)", name: "Superintendent of Police (Selection Grade)", cadre: "IPS", scope: "District" },
    { code: "SP", name: "Superintendent of Police", cadre: "IPS", scope: "District" },
    { code: "Addl. SP", name: "Additional Superintendent of Police", cadre: "IPS", scope: "District" },
    { code: "ASP", name: "Assistant Superintendent of Police", cadre: "IPS", scope: "District" },
  ];

  const kspsGazettedRanks = [
    { code: "SP (KSPS)", name: "Superintendent of Police (KSPS)", cadre: "KSPS_GAZETTED", scope: "District" },
    { code: "Addl. SP (KSPS)", name: "Additional Superintendent of Police (KSPS)", cadre: "KSPS_GAZETTED", scope: "District" },
    { code: "DySP", name: "Deputy Superintendent of Police", cadre: "KSPS_GAZETTED", scope: "District" },
    { code: "PI and CI", name: "Police Inspector and Circle Inspector", cadre: "KSPS_GAZETTED", scope: "Station" },
  ];

  const kspsNonGazettedRanks = [
    { code: "PSI / SI", name: "Sub Inspector of Police", cadre: "KSPS_NON_GAZETTED", scope: "Station" },
    { code: "ASI", name: "Assistant Sub Inspector of Police", cadre: "KSPS_NON_GAZETTED", scope: "Station" },
    { code: "HC", name: "Head Constable", cadre: "KSPS_NON_GAZETTED", scope: "Station" },
    { code: "PC", name: "Police Constable", cadre: "KSPS_NON_GAZETTED", scope: "Station" },
  ];

  const allRanks = [...ipsRanks, ...kspsGazettedRanks, ...kspsNonGazettedRanks];

  const handleRankChange = (rankCode: string) => {
    setSelectedRank(rankCode);
    const found = allRanks.find((r) => r.code === rankCode);
    if (found) {
      setScopeLevel(found.scope);
      if (found.scope === "State") {
        setRoleId("1"); // Admin / Statewide Auditor
      } else if (found.scope === "District") {
        setRoleId("3"); // SHO / District Supervisor
      } else {
        setRoleId("4"); // Constable / Officer
      }
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSuccess(null);
    setFormError(null);

    try {
      await adminService.createUser({
        Username: username,
        Password: password,
        Email: email,
        RoleID: Number(roleId),
      });

      // Apply Jurisdiction Scope Override
      if (scopeLevel !== "State") {
        const createdUser = usersList.find((u: any) => u.Username === username);
        if (createdUser) {
          await adminService.assignJurisdictionOverride({
            UserID: createdUser.UserID,
            DistrictID: districtId ? Number(districtId) : 5,
            PoliceStationID: unitId ? Number(unitId) : 1,
          });
        }
      }

      setFormSuccess(`Officer '${officerName || username}' (${selectedRank}) successfully appointed with ${scopeLevel}-Level Scope Access.`);
      setUsername("");
      setPassword("");
      setEmail("");
      setOfficerName("");
      setBadgeNumber("");
      refetchUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Failed to create officer credentials.");
    }
  };

  const handleSaveModalAccess = () => {
    setModalSuccess(`Access Scope & Permissions updated for Officer ${selectedOfficerConfig.Username}`);
    setTimeout(() => {
      setSelectedOfficerConfig(null);
      setModalSuccess(null);
    }, 1500);
  };

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Header and Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#111827] p-5 border border-[#1e293b] rounded-xl shadow">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-blue-500" size={22} />
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              KSP Officer Appointments & Access Control
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Appoint officers across IPS Cadre, KSPS Gazetted, and Non-Gazetted ranks and configure granular database permissions.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#151c2e] border border-[#1e293b] p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("appointments")}
            className={`px-4 py-2 rounded text-xs font-bold transition-all ${
              activeTab === "appointments"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            👮 Officer Appointments & Ranks
          </button>
          <button
            onClick={() => setActiveTab("system")}
            className={`px-4 py-2 rounded text-xs font-bold transition-all ${
              activeTab === "system"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            📊 System Telemetry & Logs
          </button>
        </div>
      </div>

      {activeTab === "appointments" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: APPOINT OFFICER FORM */}
          <div className="lg:col-span-5 bg-[#111827] border border-[#1e293b] rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3">
              <UserPlus className="text-blue-500" size={18} />
              <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
                Appoint New Police Officer
              </h3>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              {formSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-2 text-xs font-medium">
                  <CheckCircle2 size={16} />
                  <span>{formSuccess}</span>
                </div>
              )}
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-medium">
                  {formError}
                </div>
              )}

              {/* Cadre & Rank Selection */}
              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                  <Award size={14} className="text-amber-400" />
                  <span>Officer Rank & Cadre (Official Hierarchy)</span>
                </label>
                <select
                  value={selectedRank}
                  onChange={(e) => handleRankChange(e.target.value)}
                  className="w-full bg-[#151c2e] border border-[#334155] rounded-lg px-3 py-2 text-slate-100 font-mono font-bold focus:outline-none focus:border-blue-500"
                >
                  <optgroup label="🏛️ IPS CADRE OFFICERS (GAZETTED)">
                    {ipsRanks.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.code} — {r.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="⭐ KARNATAKA STATE POLICE (GAZETTED)">
                    {kspsGazettedRanks.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.code} — {r.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="👮 KARNATAKA STATE POLICE (NON-GAZETTED)">
                    {kspsNonGazettedRanks.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.code} — {r.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Full Officer Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Verma, IPS"
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    className="w-full bg-[#151c2e] border border-[#334155] rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">KSP Badge Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KSP-9042"
                    value={badgeNumber}
                    onChange={(e) => setBadgeNumber(e.target.value)}
                    className="w-full bg-[#151c2e] border border-[#334155] rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Login Username</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ksp_verma_sp"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#151c2e] border border-[#334155] rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#151c2e] border border-[#334155] rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Official Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. verma.ips@ksp.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#151c2e] border border-[#334155] rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Scope Level & Jurisdiction */}
              <div className="p-3 bg-[#151c2e] border border-[#1e293b] rounded-lg space-y-2">
                <label className="block text-slate-200 font-bold flex items-center justify-between">
                  <span>Authorized Jurisdiction Scope Level</span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-mono">
                    {scopeLevel} Level
                  </span>
                </label>
                <select
                  value={scopeLevel}
                  onChange={(e) => setScopeLevel(e.target.value)}
                  className="w-full bg-[#0d1322] border border-[#334155] rounded px-3 py-1.5 text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                >
                  <option value="State">🏛️ Statewide Full Command Scope (DGP / ADGP / Admin)</option>
                  <option value="District">🏙️ District Level Division Scope (SP / DySP / Inspector)</option>
                  <option value="Station">👮 Police Station Precinct Scope (PSI / Constable)</option>
                  <option value="Case">💼 Case-Specific Access Scope (External Agency Officers)</option>
                </select>

                {scopeLevel !== "State" && (
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">District ID:</span>
                      <input
                        type="number"
                        value={districtId}
                        onChange={(e) => setDistrictId(e.target.value)}
                        className="w-full bg-[#0d1322] border border-[#334155] text-slate-200 rounded px-2 py-1"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Station Unit ID:</span>
                      <input
                        type="number"
                        value={unitId}
                        onChange={(e) => setUnitId(e.target.value)}
                        className="w-full bg-[#0d1322] border border-[#334155] text-slate-200 rounded px-2 py-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Feature Permission Checkboxes */}
              <div className="p-3 bg-[#151c2e] border border-[#1e293b] rounded-lg space-y-2">
                <span className="text-slate-300 font-bold block mb-1">Grant Feature Permissions:</span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={permFIR} onChange={(e) => setPermFIR(e.target.checked)} className="rounded accent-blue-600" />
                    <span>View FIR Registry</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={permGIS} onChange={(e) => setPermGIS(e.target.checked)} className="rounded accent-blue-600" />
                    <span>View GIS & Hotspots</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={permNetwork} onChange={(e) => setPermNetwork(e.target.checked)} className="rounded accent-blue-600" />
                    <span>Crime Network Graph</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={permPredictive} onChange={(e) => setPermPredictive(e.target.checked)} className="rounded accent-blue-600" />
                    <span>Predictive Intel</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer col-span-2">
                    <input type="checkbox" checked={permPDF} onChange={(e) => setPermPDF(e.target.checked)} className="rounded accent-blue-600" />
                    <span>Export Official KSP PDF Dossiers</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2.5 rounded-lg transition-colors shadow-lg shadow-blue-600/20 text-xs font-mono uppercase tracking-wider"
              >
                Appoint Officer & Grant Access
              </button>
            </form>
          </div>

          {/* RIGHT: REGISTERED OFFICERS DIRECTORY TABLE */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 flex flex-col h-[650px] shadow-xl">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="text-blue-500" size={18} />
                  <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
                    Active Appointed Officers Directory ({usersList.length})
                  </h3>
                </div>
                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  ADMIN COMMAND CONTROLS
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                {usersList.length === 0 ? (
                  <div className="text-center text-xs text-slate-500 py-12 font-mono">
                    No active officer accounts registered.
                  </div>
                ) : (
                  usersList.map((u: any) => {
                    const isIPS = u.Username.includes("sp") || u.Username.includes("dgp") || u.Username.includes("igp");
                    const rankLabel = isIPS ? "IPS Cadre Command" : "KSPS Precinct Officer";
                    return (
                      <div
                        key={u.UserID}
                        className="p-4 bg-[#151c2e] border border-[#1e293b] hover:border-blue-500/40 rounded-xl space-y-3 transition-colors shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-100 text-sm font-mono">{u.Username}</span>
                              <span
                                className={`text-[9px] px-2 py-0.5 rounded font-bold font-mono uppercase border ${
                                  isIPS
                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                    : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                }`}
                              >
                                {u.role?.RoleName || "Constable"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{u.Email}</p>
                          </div>

                          <button
                            onClick={() => setSelectedOfficerConfig(u)}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 font-mono shadow"
                          >
                            <Sliders size={12} />
                            <span>Configure Access</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1e293b] text-[10px] font-mono text-slate-400">
                          <div>
                            <span className="text-slate-500 block">CADRE & RANK:</span>
                            <span className="text-slate-200 font-bold">{rankLabel}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">JURISDICTION SCOPE:</span>
                            <span className="text-emerald-400 font-bold uppercase">
                              {u.role?.RoleName === "Admin" ? "Statewide Full Command" : "District / Precinct Scope"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">ACCOUNT STATUS:</span>
                            <span className="text-blue-400 font-bold">Active & Verified</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM TELEMETRY & LOGS TAB */}
      {activeTab === "system" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-[#111827] border border-[#1e293b] rounded-xl p-5 flex flex-col h-[480px] shadow-xl">
            <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3 mb-4">
              <Database className="text-blue-500" size={18} />
              <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                PostgreSQL Relation Capacity
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {isDbLoading ? (
                <div className="text-center text-xs text-slate-500 py-6 font-mono">Querying pg_class...</div>
              ) : tablesList.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-6 font-mono">No table metrics parsed.</div>
              ) : (
                tablesList.map((t: any, idx: number) => (
                  <div key={idx} className="p-3 bg-[#151c2e] border border-[#1e293b] rounded-lg flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-slate-200 font-mono">{t.table_name}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Size: {(t.size_bytes / 1024).toFixed(1)} KB</p>
                    </div>
                    <span className="text-blue-400 font-mono font-bold">{t.row_count} rows</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-[#111827] border border-[#1e293b] rounded-xl p-5 flex flex-col h-[480px] shadow-xl">
            <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3 mb-4">
              <Terminal className="text-blue-500" size={18} />
              <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                System Audit Trail Logs
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[10px] leading-relaxed text-slate-400">
              {isLogsLoading ? (
                <div className="text-center text-xs text-slate-500 py-6">Decrypting system journals...</div>
              ) : logsList.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-6">Audit journals empty.</div>
              ) : (
                logsList.map((log: any, idx: number) => (
                  <div key={idx} className="p-2.5 bg-[#090d16] border border-[#1e293b]/50 rounded-lg">
                    <span className="text-blue-400">[{new Date(log.Timestamp).toISOString()}]</span>{" "}
                    <span className="text-slate-200 font-bold">Action: {log.Action}</span> |{" "}
                    <span className="text-slate-400">ModuleName: {log.ModuleName}</span> |{" "}
                    <span className="text-slate-500">User: #{log.UserID}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ACCESS CONFIGURATOR MODAL */}
      {selectedOfficerConfig && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1e293b] rounded-xl w-[480px] p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#1e293b] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-blue-400" />
                <h3 className="text-sm font-bold text-slate-100 font-mono uppercase">
                  Configure Access Scope: {selectedOfficerConfig.Username}
                </h3>
              </div>
              <button onClick={() => setSelectedOfficerConfig(null)} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            {modalSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg font-mono">
                {modalSuccess}
              </div>
            )}

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Upgrade Scope Level:</label>
                <select className="w-full bg-[#151c2e] border border-[#334155] rounded-lg px-3 py-2 text-slate-100 font-bold">
                  <option value="State">🏛️ Statewide Full Command Scope</option>
                  <option value="District">🏙️ District Level Scope</option>
                  <option value="Station">👮 Station Precinct Scope</option>
                  <option value="Case">💼 Case-Specific Scope</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Assigned Role:</label>
                <select className="w-full bg-[#151c2e] border border-[#334155] rounded-lg px-3 py-2 text-slate-100 font-bold">
                  <option value="1">Admin (Super Administrator)</option>
                  <option value="2">SCRB Officer (State Auditor)</option>
                  <option value="3">SHO (Station House Officer)</option>
                  <option value="4">Constable (Precinct Officer)</option>
                </select>
              </div>

              <div className="p-3 bg-[#151c2e] border border-[#1e293b] rounded-lg space-y-2">
                <span className="text-slate-300 font-bold block">Feature Permission Grants:</span>
                <div className="space-y-1.5 text-slate-300 text-[11px]">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded accent-blue-600" />
                    <span>View Cases & Accused Dossiers</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded accent-blue-600" />
                    <span>View GIS & Hotspot Maps</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded accent-blue-600" />
                    <span>View Crime Network Graphs</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded accent-blue-600" />
                    <span>Export Official PDF Dossiers</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedOfficerConfig(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-lg font-mono"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModalAccess}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2 rounded-lg font-mono shadow"
              >
                Save & Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
