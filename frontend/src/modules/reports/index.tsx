import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reportService } from "../../services/reportService";
import { FileText, Download, CheckCircle } from "lucide-react";

export default function Reports() {
  const queryClient = useQueryClient();

  // Fetch report logs history
  const { data: historyData, isLoading } = useQuery({
    queryKey: ["reportHistory"],
    queryFn: () => reportService.getReportHistory(),
  });

  const history = historyData?.history || [];

  // Generate Report Mutation
  const generateMutation = useMutation({
    mutationFn: (caseId: number) => reportService.generateReport(caseId),
    onSuccess: () => {
      alert("Executive Crime dossier compiled successfully.");
      queryClient.invalidateQueries({ queryKey: ["reportHistory"] });
    },
  });

  return (
    <div className="space-y-6 select-none">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Executive Report Compiler</h1>
        <p className="text-xs text-slate-400 mt-1">Compile and export official case dossiers for judicial registry submissions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compiler Form */}
        <div className="lg:col-span-1 bg-[#111827] border border-[#1e293b] rounded p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
            Compile Dossier
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Specify Case Master ID to pull incident briefs, evidence logs, suspect records, and AI risk metrics into a single printable report.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const caseId = parseInt((form.elements.namedItem("caseId") as HTMLInputElement).value);
              if (caseId) generateMutation.mutate(caseId);
            }}
            className="space-y-3 pt-2"
          >
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1">
                Case Master ID
              </label>
              <input
                type="number"
                name="caseId"
                required
                placeholder="e.g. 1"
                className="w-full bg-[#1e293b] border border-[#1e293b] text-slate-200 text-xs rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={generateMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded py-2 text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              {generateMutation.isPending ? "Compiling Dossier..." : "Compile PDF Report"}
            </button>
          </form>
        </div>

        {/* History log */}
        <div className="lg:col-span-2 bg-[#111827] border border-[#1e293b] rounded p-5 flex flex-col h-[400px]">
          <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider mb-4 border-b border-[#1e293b] pb-2">
            Generated Report Logs
          </h3>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {isLoading ? (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">Retrieving archives...</div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">No reports compiled yet.</div>
            ) : (
              history.map((h: any, idx: number) => (
                <div key={idx} className="bg-[#151c2e] border border-[#1e293b] p-3.5 rounded flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <FileText className="text-blue-500" size={16} />
                    <div>
                      <p className="font-semibold text-slate-200">Case Dossier #{h.CaseMasterID}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Compiled: {new Date(h.CompiledAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                      <CheckCircle size={12} />
                      <span>Ready</span>
                    </span>
                    <a
                      href={h.PDFUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1 text-[10px] font-mono"
                    >
                      <Download size={12} />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
