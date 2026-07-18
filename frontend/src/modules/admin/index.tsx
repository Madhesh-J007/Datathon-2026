import { useQuery } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import { Database, Terminal } from "lucide-react";

export default function Admin() {
  const { data: logs, isLoading: isLogsLoading } = useQuery<any[]>({
    queryKey: ["adminLogs"],
    queryFn: () => adminService.getAuditLogs(),
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

  return (
    <div className="space-y-6 select-none">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Platform Administration Console</h1>
        <p className="text-xs text-slate-400 mt-1">Audit trail monitoring and telemetry database status</p>
      </div>

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
    </div>
  );
}
