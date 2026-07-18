import NetworkGraphCanvas from "../../components/graph/NetworkGraphCanvas";
import { useQuery } from "@tanstack/react-query";
import { networkService } from "../../services/networkService";
import { Users } from "lucide-react";

export default function NetworkModule() {
  const { data: gangData, isLoading } = useQuery({
    queryKey: ["networkGangsModule"],
    queryFn: () => networkService.getGangs(),
  });

  const communities = gangData?.Communities || [];

  return (
    <div className="flex flex-col h-full space-y-5 select-none">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Criminal Network Explorer</h1>
        <p className="text-xs text-slate-400 mt-1 font-sans">
          Graph traversal of criminal relationships, gang structures, and syndicates
        </p>
      </div>

      <div className="flex-1 min-h-0 flex gap-5">
        <div className="w-80 bg-[#111827] border border-[#1e293b] rounded p-4 flex flex-col overflow-y-auto">
          <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3 mb-4">
            <Users className="text-blue-500" size={16} />
            <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
              Identified Gang Communities
            </h3>
          </div>

          {isLoading ? (
            <div className="text-center text-xs text-slate-500 py-6 font-mono">Running Louvain clustering...</div>
          ) : communities.length === 0 ? (
            <div className="text-center text-xs text-slate-500 py-6 font-mono">No communities detected.</div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto min-h-0 pr-1">
              {communities.map((g: any, idx: number) => (
                <div key={idx} className="bg-[#151c2e] border border-[#1e293b] p-3 rounded text-xs leading-relaxed">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-200">Syndicate Group #{idx + 1}</span>
                    <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono">
                      {(g.Confidence * 100).toFixed(0)}% Conf
                    </span>
                  </div>
                  <p className="text-slate-400 text-[10px] italic">"{g.Explanation}"</p>
                  <div className="mt-2 text-[10px] text-slate-500 font-mono flex justify-between items-center gap-1.5">
                    <span>Members: {g.MemberPersonIDs?.length || 0} suspects</span>
                    <span className="text-slate-600 uppercase tracking-wider text-[9px]">louvain_community · {gangData?.model_version || "phase4-network-community-v1"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 bg-[#111827] border border-[#1e293b] rounded overflow-hidden relative">
          <NetworkGraphCanvas />
        </div>
      </div>
    </div>
  );
}

