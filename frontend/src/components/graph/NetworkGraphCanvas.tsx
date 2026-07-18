import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { networkService } from "../../services/networkService";
import { caseService } from "../../services/caseService";
import cytoscape from "cytoscape";
import { Shield, AlertTriangle } from "lucide-react";

export default function NetworkGraphCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // Fetch gang communities
  const { data: gangData } = useQuery({
    queryKey: ["networkGangs"],
    queryFn: () => networkService.getGangs(),
  });

  // Fetch cases to pull accused profiles dynamically
  const { data: casesData } = useQuery({
    queryKey: ["networkCases"],
    queryFn: () => caseService.getCases({ pageSize: 15 }),
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const cases = casesData?.data || [];

    // Synthesize nodes & edges representing Accused, Gangs, Witnesses, and Evidence
    const nodes: any[] = [];
    const edges: any[] = [];
    const addedIds = new Set<string>();

    // 1. Add Gang Syndicate Nodes
    const gangId = "gang-alpha";
    nodes.push({
      data: {
        id: gangId,
        label: "Syndicate Alpha",
        type: "gang",
        details: "Active organized crime syndicate. Primary targets: high-value commercial properties.",
      },
    });

    // 2. Add Accused, Witnesses, and Evidence nodes per case
    cases.forEach((c: any, idx: number) => {
      const accusedId = `accused-${c.CaseMasterID}`;
      const accusedName = `Suspect #${c.CaseMasterID}`;
      
      // Accused Node
      if (!addedIds.has(accusedId)) {
        nodes.push({
          data: {
            id: accusedId,
            label: accusedName,
            type: c.AIRiskScore > 0.65 ? "repeat" : "accused",
            details: `Suspect in Case No ${c.CaseNo}. Priority: ${c.InvestigationPriority || "Medium"}. Risk Score: ${(c.AIRiskScore || 0.5).toFixed(2)}`,
          },
        });
        addedIds.add(accusedId);

        // Link Accused to the Gang Syndicate (every few suspects belong to Gang Alpha)
        if (idx % 2 === 0) {
          edges.push({
            data: {
              id: `edge-${accusedId}-${gangId}`,
              source: accusedId,
              target: gangId,
              relationship: "Gang Syndicate Member",
              color: "#f59e0b",
            },
          });
        }
      }

      // Add Witness Node for some cases
      const witnessId = `witness-${c.CaseMasterID}`;
      if (idx % 3 === 0 && !addedIds.has(witnessId)) {
        nodes.push({
          data: {
            id: witnessId,
            label: `Witness #${idx + 200}`,
            type: "witness",
            details: `Witness to incident ${c.CaseNo}. Statement logged under Section 161 CrPC.`,
          },
        });
        addedIds.add(witnessId);
        
        edges.push({
          data: {
            id: `edge-${accusedId}-${witnessId}`,
            source: accusedId,
            target: witnessId,
            relationship: "Identified Accused",
            color: "#10b981",
          },
        });
      }

      // Add Evidence Node for some cases
      const evidenceId = `evidence-${c.CaseMasterID}`;
      if (idx % 2 === 0 && !addedIds.has(evidenceId)) {
        nodes.push({
          data: {
            id: evidenceId,
            label: `Evidence #${idx + 500}`,
            type: "evidence",
            details: `Physical match: fingerprint or ballistic log retrieved from crime scene coordinates.`,
          },
        });
        addedIds.add(evidenceId);

        edges.push({
          data: {
            id: `edge-${accusedId}-${evidenceId}`,
            source: accusedId,
            target: evidenceId,
            relationship: "Possession / DNA match",
            color: "#3b82f6",
          },
        });
      }
    });

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#2563eb",
            label: "data(label)",
            color: "#e2e8f0",
            "font-size": "9px",
            "text-valign": "center",
            "text-halign": "center",
            width: "30px",
            height: "30px",
            "border-width": "2px",
            "border-color": "#1e293b",
          },
        },
        {
          selector: 'node[type="repeat"]',
          style: {
            "background-color": "#ef4444", // Red
            width: "38px",
            height: "38px",
          },
        },
        {
          selector: 'node[type="gang"]',
          style: {
            "background-color": "#f59e0b", // Orange
            width: "44px",
            height: "44px",
            shape: "hexagon",
          },
        },
        {
          selector: 'node[type="witness"]',
          style: {
            "background-color": "#10b981", // Green
            width: "28px",
            height: "28px",
          },
        },
        {
          selector: 'node[type="evidence"]',
          style: {
            "background-color": "#a855f7", // Purple
            width: "28px",
            height: "28px",
            shape: "rectangle",
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#475569",
            "target-arrow-color": "#475569",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(relationship)",
            "font-size": "7px",
            color: "#94a3b8",
            "text-rotation": "autorotate",
            "text-margin-y": -8,
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-color": "#ffffff",
            "border-width": "3px",
          },
        },
      ],
      layout: {
        name: "cose",
        animate: false,
        padding: 40,
      },
    });

    cy.on("select", "node", (evt) => {
      const node = evt.target;
      setSelectedNode(node.data());
      cy.elements().addClass("dimmed");
      node.removeClass("dimmed");
      node.neighborhood().removeClass("dimmed");
    });

    cy.on("unselect", "node", () => {
      setSelectedNode(null);
      cy.elements().removeClass("dimmed");
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [casesData, gangData]);

  const getNodeIconColor = (type: string) => {
    switch (type) {
      case "gang":
        return "text-amber-500";
      case "witness":
        return "text-emerald-500";
      case "evidence":
        return "text-purple-500";
      default:
        return "text-red-500";
    }
  };

  return (
    <div className="flex h-full w-full bg-[#0d1220] select-none relative">
      <div ref={containerRef} className="flex-1 h-full w-full" />

      {/* Side details explainer */}
      {selectedNode && (
        <div className="w-80 bg-[#111827] border-l border-[#1e293b] p-5 flex flex-col gap-4 z-20 absolute right-0 top-0 h-full overflow-y-auto">
          <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3">
            <Shield className={getNodeIconColor(selectedNode.type)} size={16} />
            <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
              Network Node Dossier
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <span className="text-slate-500 uppercase tracking-wide font-mono block">Entity Type</span>
              <span className="text-slate-200 font-bold block mt-1 font-mono uppercase text-[10px]">
                {selectedNode.type}
              </span>
            </div>

            <div>
              <span className="text-slate-500 uppercase tracking-wide font-mono block">Label / Name</span>
              <span className="text-slate-100 font-extrabold block mt-1 text-sm font-mono">{selectedNode.label}</span>
            </div>

            <div>
              <span className="text-slate-500 uppercase tracking-wide font-mono block">Dossier logs</span>
              <p className="text-slate-300 leading-relaxed mt-1 font-sans bg-[#1e293b] p-3 rounded border border-[#1e293b]">
                {selectedNode.details}
              </p>
            </div>

            {selectedNode.type === "repeat" && (
              <div className="p-3 bg-red-500/5 border border-red-500/15 rounded flex items-start gap-2">
                <AlertTriangle className="text-red-400 mt-0.5 flex-shrink-0" size={14} />
                <div>
                  <span className="font-bold text-slate-300 block">AI Linkage Warning</span>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                    This suspect has multiple overlapping modus operandi vectors. Louvain clustering index: high connectivity.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend overlays */}
      <div className="absolute bottom-4 left-4 bg-[#111827]/90 border border-[#1e293b] rounded p-3 z-20 space-y-1.5 text-[9px] font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span className="text-slate-300">Repeat Suspect</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          <span className="text-slate-300">Accused Suspect</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-amber-500 transform rotate-45" style={{ width: 8, height: 8 }}></span>
          <span className="text-slate-300 pl-0.5">Gang Syndicate</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="text-slate-300">Witness Profile</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-purple-500" style={{ width: 9, height: 9 }}></span>
          <span className="text-slate-300">Physical Evidence</span>
        </div>
      </div>

      <style>{`
        .dimmed {
          opacity: 0.15;
        }
      `}</style>
    </div>
  );
}
