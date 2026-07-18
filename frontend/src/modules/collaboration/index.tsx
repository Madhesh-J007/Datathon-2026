import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collaborationService } from "../../services/collaborationService";
import { FileText, CheckCircle2, UserCheck } from "lucide-react";

export default function Collaboration() {
  const queryClient = useQueryClient();
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["collabRequests"],
    queryFn: () => collaborationService.getCollaborationRequests(),
  });

  const approveMutation = useMutation({
    mutationFn: (requestId: number) => collaborationService.approveCollaborationRequest(requestId),
    onSuccess: () => {
      alert("Cross-jurisdiction data access approved successfully.");
      queryClient.invalidateQueries({ queryKey: ["collabRequests"] });
    },
  });

  return (
    <div className="space-y-6 select-none">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Cross-Jurisdiction Collaboration Hub</h1>
        <p className="text-xs text-slate-400 mt-1">Review and approve access logs for cross-precinct intelligence requests</p>
      </div>

      <div className="bg-[#111827] border border-[#1e293b] rounded p-5 flex flex-col h-[480px]">
        <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider mb-4 border-b border-[#1e293b] pb-2">
          Operational Approval Log Queue
        </h3>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {isLoading ? (
            <div className="text-center py-10 text-xs text-slate-500 font-mono">Retrieving secure tokens...</div>
          ) : !requests || requests.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500 font-mono">All collaboration requests resolved.</div>
          ) : (
            requests.map((req: any, idx: number) => (
              <div key={idx} className="bg-[#151c2e] border border-[#1e293b] p-4 rounded flex items-center justify-between text-xs gap-6">
                <div className="flex items-start gap-3">
                  <FileText className="text-blue-500 mt-1 flex-shrink-0" size={16} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">Request #{req.CollaborationRequestID}</span>
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono">
                        {req.RequestStatus || "Pending Approval"}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-1">
                      Officer <span className="font-bold text-blue-400 font-mono">ID #{req.RequestingOfficerID}</span> is requesting data access to Case file <span className="font-bold text-blue-400 font-mono">ID #{req.CaseMasterID}</span>.
                    </p>
                    <p className="text-[10px] text-slate-500 italic mt-1 font-sans">
                      Justification: "{req.Justification || "Cross-precinct connection verification."}"
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {req.RequestStatus === "Approved" ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-500/5 px-2.5 py-1 rounded border border-emerald-500/15">
                      <CheckCircle2 size={12} />
                      <span>Approved</span>
                    </span>
                  ) : confirmId === req.CollaborationRequestID ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          approveMutation.mutate(req.CollaborationRequestID);
                          setConfirmId(null);
                        }}
                        disabled={approveMutation.isPending}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded text-[10px] font-bold px-3 py-1.5 uppercase tracking-wider transition-colors flex items-center gap-1 focus:outline-none"
                      >
                        <UserCheck size={12} />
                        <span>Confirm?</span>
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[10px] font-bold px-2 py-1.5 uppercase tracking-wider transition-colors focus:outline-none"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(req.CollaborationRequestID)}
                      disabled={approveMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded text-[10px] font-bold px-3 py-1.5 uppercase tracking-wider transition-colors flex items-center gap-1 focus:outline-none font-semibold border border-blue-500/30 shadow-lg shadow-blue-500/10"
                    >
                      <UserCheck size={12} />
                      <span>Approve Access</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
