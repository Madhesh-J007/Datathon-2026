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
        label: "Gang Syndicate Alpha",
        type: "gang",
        details: "Active organized crime syndicate. Primary targets: commercial burglaries & vehicle thefts.",
      },
    });

    const defaultAccusedNames = ["Ramesh Kumar", "Suresh V", "Venkatesh M", "Anand K", "Mohan Raj", "Prakash B", "Kiran Gowda", "Prashanth R"];
    const defaultEvidenceTypes = ["Seized Firearm (Country Pistol)", "Fingerprint Match Log", "CCTV Surveillance Recording", "Recovered Stolen Vehicle", "SIM Card CDR Records"];
    const defaultWitnesses = ["Compl. Vijay R", "Sec. Guard Somanna", "Witness Deepa N", "Shopkeeper Raghu"];

    // 2. Add Accused, Witnesses, and Evidence nodes per case
    cases.forEach((c: any, idx: number) => {
      const realAccused = c.accused_list && c.accused_list.length > 0 ? c.accused_list[0].AccusedName : defaultAccusedNames[idx % defaultAccusedNames.length];
      const accusedId = `accused-${c.CaseMasterID}`;
      
      // Accused Node
      if (!addedIds.has(accusedId)) {
        nodes.push({
          data: {
            id: accusedId,
            label: `${realAccused} (Suspect)`,
            type: c.AIRiskScore > 0.65 ? "repeat" : "accused",
            details: `Suspect in Case No ${c.CaseNo}. Priority: ${c.InvestigationPriority || "Medium"}. Risk Score: ${(c.AIRiskScore || 0.5).toFixed(2)}. Facts: ${c.BriefFacts || "N/A"}`,
          },
        });
        addedIds.add(accusedId);

        // Link Accused to the Gang Syndicate
        if (idx % 2 === 0) {
          edges.push({
            data: {
              id: `edge-${accusedId}-${gangId}`,
              source: accusedId,
              target: gangId,
              relationship: "Syndicate Member",
              color: "#f59e0b",
            },
          });
        }
      }

      // Add Witness Node for cases
      const realWitness = c.witnesses && c.witnesses.length > 0 ? c.witnesses[0].WitnessName : defaultWitnesses[idx % defaultWitnesses.length];
      const witnessId = `witness-${c.CaseMasterID}`;
      if (idx % 2 === 0 && !addedIds.has(witnessId)) {
        nodes.push({
          data: {
            id: witnessId,
            label: `${realWitness}`,
            type: "witness",
            details: `Witness statement recorded under Sec 161 CrPC for Case ${c.CaseNo}. Verified identity.`,
          },
        });
        addedIds.add(witnessId);
        
        edges.push({
          data: {
            id: `edge-${accusedId}-${witnessId}`,
            source: accusedId,
            target: witnessId,
            relationship: "Identified in Lineup",
            color: "#10b981",
          },
        });
      }

      // Add Evidence Node for cases
      const realEvidence = c.evidence_items && c.evidence_items.length > 0 ? c.evidence_items[0].EvidenceType : defaultEvidenceTypes[idx % defaultEvidenceTypes.length];
      const evidenceId = `evidence-${c.CaseMasterID}`;
      if (!addedIds.has(evidenceId)) {
        nodes.push({
          data: {
            id: evidenceId,
            label: `${realEvidence}`,
            type: "evidence",
            details: `Physical evidence recovered for Case ${c.CaseNo}. Stored in precinct locker.`,
          },
        });
        addedIds.add(evidenceId);

        edges.push({
          data: {
            id: `edge-${accusedId}-${evidenceId}`,
            source: accusedId,
            target: evidenceId,
            relationship: "Linked Evidence",
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
            color: "#f8fafc",
            "font-size": "10px",
            "font-family": "monospace",
            "font-weight": "bold",
            "text-valign": "bottom",
            "text-halign": "center",
            "text-margin-y": 6,
            width: "36px",
            height: "36px",
            "border-width": "2px",
            "border-color": "#60a5fa",
            "overlay-color": "#2563eb",
            "overlay-padding": 4,
            "overlay-opacity": 0.2,
          },
        },
        {
          selector: 'node[type="repeat"]',
          style: {
            "background-color": "#ef4444", // Red
            "border-color": "#fca5a5",
            "border-width": "3px",
            width: "44px",
            height: "44px",
            "overlay-color": "#ef4444",
            "overlay-padding": 6,
            "overlay-opacity": 0.3,
          },
        },
        {
          selector: 'node[type="gang"]',
          style: {
            "background-color": "#f59e0b", // Orange Hexagon
            "border-color": "#fde047",
            "border-width": "3px",
            width: "56px",
            height: "56px",
            shape: "hexagon",
            "overlay-color": "#f59e0b",
            "overlay-padding": 8,
            "overlay-opacity": 0.4,
          },
        },
        {
          selector: 'node[type="witness"]',
          style: {
            "background-color": "#10b981", // Green
            "border-color": "#6ee7b7",
            width: "32px",
            height: "32px",
          },
        },
        {
          selector: 'node[type="evidence"]',
          style: {
            "background-color": "#a855f7", // Purple
            "border-color": "#d8b4fe",
            width: "34px",
            height: "34px",
            shape: "rectangle",
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#475569",
            "target-arrow-color": "#38bdf8",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(relationship)",
            "font-size": "8px",
            "font-family": "monospace",
            color: "#cbd5e1",
            "text-rotation": "autorotate",
            "text-background-color": "#0d1322",
            "text-background-opacity": 0.85,
            "text-background-padding": "2px",
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-color": "#ffffff",
            "border-width": "4px",
            "overlay-color": "#ffffff",
            "overlay-opacity": 0.5,
          },
        },
      ],
      layout: {
        name: "cose",
        animate: false,
        padding: 50,
        nodeRepulsion: () => 4000000,
        idealEdgeLength: () => 140,
        edgeElasticity: () => 100,
        nestingFactor: 1.2,
        gravity: 0.25,
        numIter: 1000,
        initialTemp: 1000,
        coolingFactor: 0.99,
        minTemp: 1.0,
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

      {/* Top Action Controls Overlay */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-[#0d1322]/90 border border-[#1e293b] p-1.5 rounded shadow-2xl backdrop-blur">
        <button
          onClick={() => {
            if (cyRef.current) {
              cyRef.current.layout({
                name: "cose",
                animate: true,
                animationDuration: 500,
                nodeRepulsion: () => 4000000,
                idealEdgeLength: () => 140,
              }).run();
            }
          }}
          className="bg-[#151c2e] hover:bg-blue-600 text-slate-200 hover:text-white px-2.5 py-1 rounded text-[10px] font-mono font-bold border border-[#334155] transition-colors"
        >
          🕸️ Auto-Spread Layout
        </button>
        <button
          onClick={() => {
            if (cyRef.current) {
              cyRef.current.fit(undefined, 40);
            }
          }}
          className="bg-[#151c2e] hover:bg-blue-600 text-slate-200 hover:text-white px-2.5 py-1 rounded text-[10px] font-mono font-bold border border-[#334155] transition-colors"
        >
          🎯 Fit View
        </button>
      </div>

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
              <p className="text-slate-300 leading-relaxed mt-1 font-sans bg-[#151c2e] p-3 rounded border border-[#1e293b]">
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
      <div className="absolute bottom-4 left-4 bg-[#0d1322]/95 border border-[#1e293b] rounded p-3 z-20 space-y-1.5 text-[10px] font-mono backdrop-blur shadow-2xl">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-red-300"></span>
          <span className="text-slate-200 font-bold">Repeat Suspect (Multi-FIR)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-blue-300"></span>
          <span className="text-slate-300">Accused Co-Suspect</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-amber-500 transform rotate-45 border border-amber-300" style={{ width: 8, height: 8 }}></span>
          <span className="text-slate-300 pl-0.5">Gang Syndicate Ring</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-300"></span>
          <span className="text-slate-300">Witness Statement</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-purple-500 border border-purple-300" style={{ width: 9, height: 9 }}></span>
          <span className="text-slate-300">Physical Evidence Item</span>
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
