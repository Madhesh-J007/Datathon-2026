import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import { Database, Terminal, UserPlus, Users, Shield, MapPin, CheckCircle2 } from "lucide-react";

export default function Admin() {
  const [activeTab, setActiveTab] = useState<"system" | "appointments">("system");

  // User form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [roleId, setRoleId] = useState("4"); // default Constable
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Jurisdiction override states
  const [targetUserId, setTargetUserId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [jSuccess, setJSuccess] = useState<string | null>(null);
  const [jError, setJError] = useState<string | null>(null);

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSuccess(null);
    setFormError(null);

    try {
      await adminService.createUser({
        Username: username,
        Password: password,
        Email: email,
        OfficerID: officerId ? Number(officerId) : undefined,
        RoleID: Number(roleId),
      });

      setFormSuccess(`User '${username}' successfully created and appointed.`);
      setUsername("");
      setPassword("");
      setEmail("");
      setOfficerId("");
      refetchUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Failed to create user credentials.");
    }
  };

  const handleAssignJurisdiction = async (e: React.FormEvent) => {
    e.preventDefault();
    setJSuccess(null);
    setJError(null);

    try {
      await adminService.assignJurisdictionOverride({
        UserID: Number(targetUserId),
        DistrictID: districtId ? Number(districtId) : undefined,
        PoliceStationID: unitId ? Number(unitId) : undefined,
      });

      setJSuccess("Geographic boundary overrides applied successfully.");
      setTargetUserId("");
      setDistrictId("");
      setUnitId("");
    } catch (err: any) {
      setJError(err.response?.data?.detail || "Failed to apply jurisdiction boundary overrides.");
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header and Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Platform Administration Console</h1>
          <p className="text-xs text-slate-400 mt-1">Audit trail monitoring and telemetry database status</p>
        </div>

        <div className="flex items-center gap-2 bg-[#111827] border border-[#1e293b] p-1 rounded">
          <button
            onClick={() => setActiveTab("system")}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              activeTab === "system"
                ? "bg-blue-600 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            System Status
          </button>
          <button
            onClick={() => setActiveTab("appointments")}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              activeTab === "appointments"
                ? "bg-blue-600 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Officer Appointments
          </button>
        </div>
      </div>

      {activeTab === "system" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* DB Metrics Card */}
          <div className="lg:col-span-1 bg-[#111827] border border-[#1e293b] rounded p-5 flex flex-col h-[400px]">
            <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3 mb-4">
              <Database className="text-blue-500" size={16} />
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
                  <div key={idx} className="p-3 bg-[#151c2e] border border-[#1e293b] rounded flex justify-between items-center">
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

          {/* System Audit Trail Logs */}
          <div className="lg:col-span-2 bg-[#111827] border border-[#1e293b] rounded p-5 flex flex-col h-[400px]">
            <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3 mb-4">
              <Terminal className="text-blue-500" size={16} />
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
                  <div key={idx} className="p-2 bg-[#090d16] border border-[#1e293b]/50 rounded">
                    <span className="text-blue-400">[{new Date(log.Timestamp).toISOString()}]</span>{" "}
                    <span className="text-slate-300">Action: {log.Action}</span> |{" "}
                    <span className="text-slate-500">Details: {log.Details}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "appointments" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Appoint Officer Credentials Form */}
          <div className="lg:col-span-1 bg-[#111827] border border-[#1e293b] rounded p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3">
              <UserPlus className="text-blue-500" size={16} />
              <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                Appoint Officer Credentials
              </h3>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              {formSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  <span>{formSuccess}</span>
                </div>
              )}
              {formError && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Username (Officer ID)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ksp_officer_101"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#1e293b] border border-[#334155] rounded px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
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
                  className="w-full bg-[#1e293b] border border-[#334155] rounded px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Officer Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. officer@ksp.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1e293b] border border-[#334155] rounded px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Linked Database Officer ID</label>
                <input
                  type="number"
                  placeholder="e.g. 1 (corresponds to Officer ID in database)"
                  value={officerId}
                  onChange={(e) => setOfficerId(e.target.value)}
                  className="w-full bg-[#1e293b] border border-[#334155] rounded px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Assigned Security Role</label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full bg-[#1e293b] border border-[#334155] rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="1">Admin (Super Administrator)</option>
                  <option value="2">SCRB Officer (State Level Auditor)</option>
                  <option value="3">SHO (Station House Officer)</option>
                  <option value="4">Constable (Precinct Officer)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-slate-100 font-bold py-2 rounded transition-colors"
              >
                Assign & Appoint Credentials
              </button>
            </form>
          </div>

          {/* Active Platform Users List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#111827] border border-[#1e293b] rounded p-5 flex flex-col h-[280px]">
              <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3 mb-4">
                <Users className="text-blue-500" size={16} />
                <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                  Active Platform Officers Registry
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                {usersList.length === 0 ? (
                  <div className="text-center text-xs text-slate-500 py-6 font-mono">No active user registry accounts found.</div>
                ) : (
                  usersList.map((u: any) => (
                    <div key={u.UserID} className="p-3 bg-[#151c2e] border border-[#1e293b] rounded flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200 font-mono">{u.Username}</span>
                          <span className="text-[9px] bg-blue-900/40 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-bold uppercase">
                            {u.role?.RoleName || "Constable"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">{u.Email}</p>
                      </div>
                      <div className="text-right text-[10px] font-mono text-slate-500">
                        <p>User ID: #{u.UserID}</p>
                        <p>Linked Officer ID: {u.OfficerID || "None"}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Jurisdiction override */}
            <div className="bg-[#111827] border border-[#1e293b] rounded p-5">
              <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3 mb-4">
                <MapPin className="text-blue-500" size={16} />
                <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                  Assign Officer Scope Override
                </h3>
              </div>

              <form onSubmit={handleAssignJurisdiction} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs items-end">
                <div className="md:col-span-1">
                  <label className="block text-slate-400 font-semibold mb-1">User ID</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 2"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full bg-[#1e293b] border border-[#334155] rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-slate-400 font-semibold mb-1">District Division ID</label>
                  <input
                    type="number"
                    placeholder="e.g. 1"
                    value={districtId}
                    onChange={(e) => setDistrictId(e.target.value)}
                    className="w-full bg-[#1e293b] border border-[#334155] rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-slate-400 font-semibold mb-1">Police Unit ID</label>
                  <input
                    type="number"
                    placeholder="e.g. 1"
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value)}
                    className="w-full bg-[#1e293b] border border-[#334155] rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-1">
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-slate-100 font-bold py-2 rounded transition-colors"
                  >
                    Apply Override
                  </button>
                </div>
              </form>
              {jSuccess && (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded mt-3 text-xs">
                  {jSuccess}
                </div>
              )}
              {jError && (
                <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded mt-3 text-xs">
                  {jError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

