import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { hotspotService } from "../../services/hotspotService";
import { Filter, Layers, Compass, Play, Pause } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface HotspotProps {
  activeTab?: "gis" | "dashboard";
}

export default function Hotspot({ activeTab = "gis" }: HotspotProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerLayerGroup = useRef<L.LayerGroup | null>(null);
  const predictedLayerGroup = useRef<L.LayerGroup | null>(null);
  const patrolRouteLayer = useRef<L.Polyline | null>(null);

  const [selectedHotspot, setSelectedHotspot] = useState<any>(null);
  const [timeHour, setTimeHour] = useState(12);
  const [isPlaying, setIsPlaying] = useState(false);
  const [filters, setFilters] = useState({
    district: "",
    crimeType: "",
    severity: "",
  });

  const [layers, setLayers] = useState({
    incidents: true,
    stations: true,
    predicted: true,
  });

  // Query live crime coordinates
  const { data: hotspotData } = useQuery({
    queryKey: ["hotspotsData"],
    queryFn: () => hotspotService.getHotspots(),
  });

  // Query predicted AI hotspots
  const { data: predictedData, isLoading: isPredictedLoading } = useQuery({
    queryKey: ["predictedData"],
    queryFn: () => hotspotService.getPredictedHotspots(),
  });

  const points = hotspotData?.points || [];
  const predictedHotspots = predictedData?.hotspots || [];

  // Play/pause simulation timer
  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setTimeHour((prev) => (prev >= 24 ? 0 : prev + 4));
      }, 1500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying]);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([12.9716, 77.5946], 10);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 20,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    leafletMap.current = map;
    markerLayerGroup.current = L.layerGroup().addTo(map);
    predictedLayerGroup.current = L.layerGroup().addTo(map);

    // Initial dummy polyline for patrol routing
    patrolRouteLayer.current = L.polyline([], { color: "#3b82f6", weight: 3, dashArray: "5, 10" }).addTo(map);

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Update map layers based on time, toggles, and filters
  useEffect(() => {
    const map = leafletMap.current;
    const markerGroup = markerLayerGroup.current;
    const predGroup = predictedLayerGroup.current;
    const routeLine = patrolRouteLayer.current;

    if (!map || !markerGroup || !predGroup || !routeLine) return;

    markerGroup.clearLayers();
    predGroup.clearLayers();
    routeLine.setLatLngs([]);

    // 1. Filter points dynamically by the selected hour using real incident timestamps or stable indexing
    const filteredPoints = points.filter((pt: any) => {
      let ptHour = 12;
      if (pt.IncidentFromDate) {
        ptHour = new Date(pt.IncidentFromDate).getHours();
      } else if (pt.CrimeRegisteredDate) {
        ptHour = new Date(pt.CrimeRegisteredDate).getHours();
      } else if (pt.CaseMasterID) {
        ptHour = (pt.CaseMasterID * 3) % 24;
      }
      return ptHour <= timeHour;
    });

    if (layers.incidents && filteredPoints.length > 0) {
      filteredPoints.forEach((pt: any) => {
        if (filters.crimeType && pt.BriefFacts && !pt.BriefFacts.toLowerCase().includes(filters.crimeType.toLowerCase())) return;

        let ptHour = 12;
        if (pt.IncidentFromDate) {
          ptHour = new Date(pt.IncidentFromDate).getHours();
        } else if (pt.CaseMasterID) {
          ptHour = (pt.CaseMasterID * 3) % 24;
        }

        const customIcon = L.divIcon({
          className: "custom-div-icon",
          html: `<div class="flex items-center justify-center">
            <span class="absolute inline-flex h-3.5 w-3.5 rounded-full bg-blue-500 opacity-60 animate-ping"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-blue-600 border border-white"></span>
          </div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });

        const timeStr = `${String(ptHour).padStart(2, '0')}:00 hrs`;
        const marker = L.marker([pt.latitude, pt.longitude], { icon: customIcon })
          .bindPopup(`
            <div class="text-slate-900 text-xs font-sans p-1.5">
              <strong class="text-blue-600 block mb-1">Case #${pt.CaseNo || pt.CaseMasterID || 'Incident'}</strong>
              <p class="leading-relaxed font-semibold mb-1">${pt.BriefFacts || "Crime log incident."}</p>
              <span class="text-[10px] text-slate-600 font-mono block">Incident Time: ${timeStr}</span>
              <span class="text-[10px] text-slate-500 font-mono block">Station: ${pt.PoliceStationName || "KSP Precinct"}</span>
            </div>
          `);
        markerGroup.addLayer(marker);
      });
    }

    // 2. Police Stations
    if (layers.stations) {
      const mockStations = [
        { name: "KSP Central Command HQ", lat: 12.9716, lng: 77.5946 },
        { name: "Mysuru Division Police Unit", lat: 12.2958, lng: 76.6394 },
        { name: "Belagavi Circle Station", lat: 15.8497, lng: 74.4977 },
        { name: "Hubballi Sector Station", lat: 15.3647, lng: 75.1240 },
      ];
      mockStations.forEach((st) => {
        const stationIcon = L.divIcon({
          className: "custom-div-icon",
          html: `<div class="text-emerald-400 bg-[#0d1322] border border-emerald-500/50 p-1.5 rounded-full shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
        const marker = L.marker([st.lat, st.lng], { icon: stationIcon })
          .bindPopup(`<strong class="text-slate-900 text-xs">${st.name}</strong>`);
        markerGroup.addLayer(marker);
      });
    }

    // 3. AI hotspots with clear sector names and tactical patrol recommendations
    if (layers.predicted && predictedHotspots.length > 0) {
      const sectorNames = [
        "Sector A - Commercial Market Corridor",
        "Sector B - High-Value Property Zone",
        "Sector C - Highway Bypass Intersection",
        "Sector D - Industrial Transit Hub"
      ];

      predictedHotspots.forEach((h: any, idx: number) => {
        const multiplier = Math.sin((timeHour + idx * 4) / 4) * 0.5 + 1.0; 
        const radius = 600 * multiplier;
        const color = h.confidence > 0.7 ? "#ef4444" : "#f59e0b";
        const sectorName = sectorNames[idx % sectorNames.length];

        const circle = L.circle([h.latitude, h.longitude], {
          color: color,
          fillColor: color,
          fillOpacity: 0.15 + (multiplier * 0.05),
          radius: radius,
          weight: 1.5,
        }).bindPopup(`
          <div class="text-slate-900 text-xs font-sans p-1.5">
            <strong class="text-red-600 block mb-1">${sectorName}</strong>
            <span class="block text-[10px] text-slate-700 font-bold">KDE AI Risk Confidence: ${(h.confidence * 100).toFixed(0)}%</span>
            <span class="block text-[10px] text-slate-500 font-mono mt-0.5">Coverage Radius: ${radius.toFixed(0)}m</span>
            <div class="mt-1.5 p-1 bg-blue-50 border border-blue-200 rounded text-[9.5px] text-blue-800 font-mono">
              Patrol Rec: Deploy 2 Mobile Squad Units (18:00 - 22:00)
            </div>
          </div>
        `);

        circle.on("click", () => {
          setSelectedHotspot(h);
        });

        predGroup.addLayer(circle);

        // Draw animated patrol routes to the active hotspots at this hour
        if (idx === 0 && filteredPoints.length > 0) {
          const routePoints: L.LatLngExpression[] = [
            [12.9716, 77.5946], // From HQ
            [h.latitude, h.longitude] // to Hotspot
          ];
          routeLine.setLatLngs(routePoints);
        }
      });
    }
  }, [points, predictedHotspots, layers, filters, timeHour]);

  const handleHotspotClick = (h: any) => {
    setSelectedHotspot(h);
    if (leafletMap.current) {
      leafletMap.current.setView([h.latitude, h.longitude], 12);
    }
  };

  return (
    <div className="flex h-full w-full gap-5 select-none relative font-sans">
      {/* Side Filters panel */}
      <div className="w-80 bg-[#111827] border border-[#1e293b] rounded flex flex-col h-full overflow-hidden">
        {activeTab === "gis" ? (
          <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto">
            <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3">
              <Filter className="text-blue-500" size={16} />
              <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                Crime Filters
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">District Division</label>
                <select
                  value={filters.district}
                  onChange={(e) => setFilters({ ...filters, district: e.target.value })}
                  className="w-full bg-[#1e293b] border border-[#1e293b] text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                >
                  <option value="">All Districts</option>
                  <option value="bengaluru">Bengaluru Division</option>
                  <option value="mysuru">Mysuru Division</option>
                  <option value="belagavi">Belagavi Division</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">Incident Keywords</label>
                <input
                  type="text"
                  placeholder="e.g. theft, assault..."
                  value={filters.crimeType}
                  onChange={(e) => setFilters({ ...filters, crimeType: e.target.value })}
                  className="w-full bg-[#1e293b] border border-[#1e293b] text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3 pt-2">
              <Layers className="text-blue-500" size={16} />
              <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                GIS Layer Toggles
              </h3>
            </div>

            <div className="space-y-2.5">
              <label className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.incidents}
                  onChange={(e) => setLayers({ ...layers, incidents: e.target.checked })}
                  className="rounded border-[#1e293b] bg-slate-900 text-blue-600 focus:ring-0 focus:ring-offset-0"
                />
                <span>Active Crime Markers</span>
              </label>

              <label className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.stations}
                  onChange={(e) => setLayers({ ...layers, stations: e.target.checked })}
                  className="rounded border-[#1e293b] bg-slate-900 text-blue-600 focus:ring-0 focus:ring-offset-0"
                />
                <span>Police Precinct Stations</span>
              </label>

              <label className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers.predicted}
                  onChange={(e) => setLayers({ ...layers, predicted: e.target.checked })}
                  className="rounded border-[#1e293b] bg-slate-900 text-blue-600 focus:ring-0 focus:ring-offset-0"
                />
                <span>AI Predicted Hotspots</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto">
            <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3">
              <Compass className="text-red-400" size={16} />
              <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                Top AI Risk Hotspots
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
              {isPredictedLoading ? (
                <div className="text-center text-xs text-slate-500 py-8 font-mono">Running KDE engines...</div>
              ) : predictedHotspots.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-8 font-mono">No hotspots predicted.</div>
              ) : (
                predictedHotspots.map((h: any, idx: number) => {
                  const isHigh = h.confidence > 0.7;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleHotspotClick(h)}
                      className={`p-3 rounded border transition-all cursor-pointer ${
                        selectedHotspot === h
                          ? "bg-blue-600/10 border-blue-500/50"
                          : "bg-[#151c2e] border-transparent hover:border-slate-700"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-slate-300">Zone #{idx + 1}</span>
                        <span className={`text-[10px] font-mono px-1 rounded ${
                          isHigh ? "text-red-400 bg-red-500/10 border border-red-500/20" :
                          "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                        }`}>
                          {(h.confidence * 100).toFixed(0)}% Conf
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-mono truncate">
                        Lat: {h.latitude.toFixed(4)}, Lng: {h.longitude.toFixed(4)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {selectedHotspot && (
              <div className="border-t border-[#1e293b] pt-4 mt-auto">
                <h4 className="text-xs font-bold text-slate-200 mb-2 font-mono uppercase tracking-wider text-[10px]">Zone Intelligence Details</h4>
                <div className="space-y-2 text-[11px] leading-relaxed">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-mono">Confidence Scale:</span>
                    <span className="text-emerald-400 font-bold font-mono">{(selectedHotspot.confidence).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-mono block">Contributing Factors:</span>
                    <span className="text-slate-300 font-mono block pl-2">
                      {selectedHotspot.top_factors?.join(", ") || "Historical density peaks"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Map with bottom time slider */}
      <div className="flex-1 bg-[#111827] border border-[#1e293b] rounded overflow-hidden relative flex flex-col">
        <div className="flex-1 w-full z-10">
          <div ref={mapRef} className="h-full w-full" />
        </div>

        {/* Bottom sliding intelligence drawer */}
        {selectedHotspot && (
          <div className="absolute bottom-20 left-4 right-4 bg-[#0d1322]/95 border border-blue-500/30 rounded shadow-2xl p-4 z-20 flex justify-between items-center gap-6 animate-slide-up select-none backdrop-blur">
            <div className="flex-1 space-y-1">
              <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                AI Hotspot Zone Intelligence Match
              </span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ml-2">
                kernel_density · {predictedData?.model_version || "phase4-kde-hotspot-v1"}
              </span>
              <h4 className="text-xs font-bold text-slate-100 font-mono mt-1">
                Location Coordinates: {selectedHotspot.latitude.toFixed(4)} N, {selectedHotspot.longitude.toFixed(4)} E
              </h4>
              <div className="flex flex-wrap gap-2 text-[10px] text-slate-400">
                <span>Confidence Rank: <strong className="text-emerald-400 font-mono">{(selectedHotspot.confidence * 100).toFixed(0)}%</strong></span>
                <span>•</span>
                <span>Contributing Risk Factors: <strong className="text-blue-400 font-mono">{selectedHotspot.top_factors?.join(", ") || "Historical density peaks"}</strong></span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (leafletMap.current) {
                    leafletMap.current.setView([selectedHotspot.latitude, selectedHotspot.longitude], 13);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold font-mono px-3 py-1.5 rounded transition-colors"
              >
                Recenter GIS View
              </button>
              <button
                onClick={() => setSelectedHotspot(null)}
                className="text-slate-500 hover:text-slate-300 text-xs font-bold font-mono px-2 py-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Temporal control panel */}
        <div className="bg-[#0f1422] border-t border-[#1e293b] p-4 flex items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded p-2 transition-colors focus:outline-none"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <div className="text-xs">
              <span className="block text-[10px] text-slate-500 uppercase font-mono">Simulation Hour</span>
              <span className="font-bold text-slate-200 font-mono">{timeHour.toString().padStart(2, "0")}:00 hrs</span>
            </div>
          </div>

          <div className="flex-1 px-4">
            <input
              type="range"
              min="0"
              max="24"
              step="4"
              value={timeHour}
              onChange={(e) => {
                setTimeHour(parseInt(e.target.value));
                setIsPlaying(false);
              }}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1 px-1">
              <span>00:00</span>
              <span>04:00</span>
              <span>08:00</span>
              <span>12:00</span>
              <span>16:00</span>
              <span>20:00</span>
              <span>24:00</span>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded px-3 py-1.5 text-right flex-shrink-0">
            <span className="block text-[10px] text-slate-500 font-mono uppercase">Patrol Alignment</span>
            <span className="text-blue-400 font-bold text-[10px] font-mono">Dynamic route active</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
