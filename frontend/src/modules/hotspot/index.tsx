import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { hotspotService } from "../../services/hotspotService";
import { Filter, Layers, Compass, Play, Pause, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
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

  const karnatakaDistricts: Record<number, string> = {
    1: "Bagalkot", 2: "Ballari", 3: "Belagavi", 4: "Bengaluru Rural", 5: "Bengaluru Urban",
    6: "Bidar", 7: "Chamarajanagar", 8: "Chikballapur", 9: "Chikkamagaluru", 10: "Chitradurga",
    11: "Dakshina Kannada", 12: "Davanagere", 13: "Dharwad", 14: "Gadag", 15: "Hassan",
    16: "Haveri", 17: "Kalaburagi", 18: "Kodagu", 19: "Kolar", 20: "Koppal",
    21: "Mandya", 22: "Mysuru", 23: "Raichur", 24: "Ramanagara", 25: "Shivamogga",
    26: "Tumakuru", 27: "Udupi", 28: "Uttara Kannada", 29: "Vijayapura", 30: "Yadgir", 31: "Vijayanagara"
  };

  const districtCenterCoords: Record<number, [number, number]> = {
    1: [16.1853, 75.6960], // Bagalkot
    2: [15.1394, 76.9214], // Ballari
    3: [15.8497, 74.4977], // Belagavi
    4: [13.2257, 77.5750], // Bengaluru Rural
    5: [12.9716, 77.5946], // Bengaluru Urban
    6: [17.9104, 77.5199], // Bidar
    7: [11.9261, 76.9437], // Chamarajanagar
    8: [13.4355, 77.7275], // Chikballapur
    9: [13.3161, 75.7720], // Chikkamagaluru
    10: [14.2251, 76.3980], // Chitradurga
    11: [12.9141, 74.8560], // Dakshina Kannada
    12: [14.4644, 75.9218], // Davanagere
    13: [15.4589, 75.0078], // Dharwad
    14: [15.4319, 75.6355], // Gadag
    15: [13.0033, 76.1004], // Hassan
    16: [14.7958, 75.3992], // Haveri
    17: [17.3297, 76.8343], // Kalaburagi
    18: [12.4244, 75.7382], // Kodagu
    19: [13.1367, 78.1292], // Kolar
    20: [15.3503, 76.1554], // Koppal
    21: [12.5218, 76.8951], // Mandya
    22: [12.2958, 76.6394], // Mysuru
    23: [16.2076, 77.3563], // Raichur
    24: [12.7160, 77.2814], // Ramanagara
    25: [13.9299, 75.5681], // Shivamogga
    26: [13.3409, 77.1006], // Tumakuru
    27: [13.3409, 74.7421], // Udupi
    28: [14.8142, 74.1297], // Uttara Kannada
    29: [16.8302, 75.7100], // Vijayapura
    30: [16.7705, 77.1376], // Yadgir
    31: [15.2713, 76.3869], // Vijayanagara
  };

  const crimeCategoryOptions = [
    { value: "", label: "📋 All IPC Crime Classifications" },
    { value: "burglary", label: "🌙 Residential / Night Burglary & House Breaking" },
    { value: "theft", label: "🚗 Motor Vehicle & Property Theft" },
    { value: "cyber", label: "💻 Cyber Crime & Financial Extortion" },
    { value: "assault", label: "🚨 Armed Robbery & Violent Assault" },
    { value: "women", label: "🛡️ Crimes Against Women & Children" },
    { value: "narcotics", label: "📦 NDPS & Illegal Contraband" }
  ];

  // Query live crime coordinates
  const { data: hotspotData } = useQuery({
    queryKey: ["hotspotsData", filters.district, filters.crimeType],
    queryFn: () => hotspotService.getHotspots(filters.district ? Number(filters.district) : undefined, filters.crimeType || undefined),
  });

  // Query predicted AI hotspots
  const { data: predictedData, isLoading: isPredictedLoading } = useQuery({
    queryKey: ["predictedData"],
    queryFn: () => hotspotService.getPredictedHotspots(),
  });

  const points = hotspotData?.points || [];
  const predictedHotspots = predictedData?.hotspots || [];

  // Auto-center map when a district is selected from the dropdown
  useEffect(() => {
    if (!leafletMap.current) return;
    if (filters.district && districtCenterCoords[Number(filters.district)]) {
      const coords = districtCenterCoords[Number(filters.district)];
      leafletMap.current.setView(coords, 12, { animate: true });
    }
  }, [filters.district]);

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

  // Initialize Map with Canvas Renderer & Bright Voyager Tiles bounded to Karnataka
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const karnatakaBounds: L.LatLngBoundsExpression = [
      [11.2, 73.8], // Southwest corner
      [18.9, 78.8]  // Northeast corner
    ];

    const map = L.map(mapRef.current, {
      preferCanvas: true,
      zoomControl: false,
      attributionControl: false,
      minZoom: 7,
      maxZoom: 18,
      maxBounds: karnatakaBounds,
      maxBoundsViscosity: 0.8,
    }).setView([14.5204, 75.7224], 8); // Centered over Karnataka

    // Bright, crisp CartoDB Voyager tiles with clear area names & street landmarks
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
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
        // District filter
        if (filters.district && pt.DistrictID && pt.DistrictID !== Number(filters.district)) return;

        // Crime Type / Category filter
        if (filters.crimeType) {
          const typeKey = filters.crimeType.toLowerCase();
          const facts = (pt.BriefFacts || "").toLowerCase();
          if (typeKey === "burglary" && !facts.includes("burgla") && !facts.includes("house") && !facts.includes("lurking") && !facts.includes("theft") && pt.CrimeHeadID !== 2) return;
          if (typeKey === "theft" && !facts.includes("theft") && !facts.includes("stolen") && !facts.includes("vehicle") && pt.CrimeHeadID !== 2) return;
          if (typeKey === "cyber" && !facts.includes("cyber") && !facts.includes("bank") && !facts.includes("fraud") && !facts.includes("online") && pt.CrimeHeadID !== 7) return;
          if (typeKey === "assault" && !facts.includes("assault") && !facts.includes("robbery") && !facts.includes("stab") && !facts.includes("murder") && pt.CrimeHeadID !== 1) return;
          if (typeKey === "women" && !facts.includes("dowry") && !facts.includes("molest") && !facts.includes("rape") && !facts.includes("assault") && pt.CrimeHeadID !== 3) return;
          if (typeKey === "narcotics" && !facts.includes("ganja") && !facts.includes("drug") && !facts.includes("ndps") && pt.CrimeHeadID !== 8) return;
        }

        let ptHour = 12;
        if (pt.IncidentFromDate) {
          ptHour = new Date(pt.IncidentFromDate).getHours();
        } else if (pt.CaseMasterID) {
          ptHour = (pt.CaseMasterID * 3) % 24;
        }

        const isNightBurglary = filters.crimeType === "burglary";
        const fillColor = isNightBurglary ? "#ef4444" : (pt.AIRiskScore > 0.7 ? "#f97316" : "#3b82f6");
        const radius = isNightBurglary ? 7 : 5;

        const timeStr = `${String(ptHour).padStart(2, '0')}:00 hrs`;
        const marker = L.circleMarker([pt.latitude, pt.longitude], {
          renderer: L.canvas(),
          radius: radius,
          fillColor: fillColor,
          color: "#ffffff",
          weight: 1,
          opacity: 0.9,
          fillOpacity: 0.75,
        }).bindPopup(`
          <div class="text-slate-900 text-xs font-sans p-1.5">
            <strong class="text-blue-600 block mb-1">Case #${pt.CaseNo || pt.CaseMasterID || 'Incident'}</strong>
            <p class="leading-relaxed font-semibold mb-1">${pt.BriefFacts || "Crime log incident."}</p>
            <span class="text-[10px] text-slate-600 font-mono block">Incident Time: ${timeStr}</span>
            <span class="text-[10px] text-slate-500 font-mono block">Station: ${pt.PoliceStationName || "KSP Precinct"}</span>
            ${pt.AIRiskScore ? `<span class="text-[10px] text-red-600 font-bold block mt-1">AI Risk Score: ${pt.AIRiskScore.toFixed(2)}</span>` : ''}
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
                  className="w-full bg-[#1e293b] border border-[#334155] text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-mono font-bold"
                >
                  <option value="">All Karnataka Districts (31)</option>
                  {Object.entries(karnatakaDistricts).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">IPC Crime Category</label>
                <select
                  value={filters.crimeType}
                  onChange={(e) => setFilters({ ...filters, crimeType: e.target.value })}
                  className="w-full bg-[#1e293b] border border-[#334155] text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-mono font-bold"
                >
                  {crimeCategoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
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
        <div className="flex-1 w-full z-10 relative">
          <div ref={mapRef} className="h-full w-full" />

          {/* Directional Pan Navigation Controls Overlay */}
          <div className="absolute top-4 right-4 z-20 flex flex-col items-center gap-1.5 bg-[#0d1322]/90 border border-[#1e293b] p-2.5 rounded shadow-2xl backdrop-blur select-none">
            <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-widest mb-0.5">
              GIS Navigation Pad
            </span>
            <div className="grid grid-cols-3 gap-1 w-28">
              <div></div>
              <button
                onClick={() => leafletMap.current?.panBy([0, -150])}
                title="Pan North (Up)"
                className="bg-[#1e293b] hover:bg-blue-600 text-slate-200 hover:text-white p-2 rounded flex items-center justify-center transition-colors border border-[#334155]"
              >
                <ChevronUp size={16} />
              </button>
              <div></div>
              <button
                onClick={() => leafletMap.current?.panBy([-150, 0])}
                title="Pan West (Left)"
                className="bg-[#1e293b] hover:bg-blue-600 text-slate-200 hover:text-white p-2 rounded flex items-center justify-center transition-colors border border-[#334155]"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => leafletMap.current?.setView([14.5204, 75.7224], 8)}
                title="Reset Karnataka View"
                className="bg-[#1e293b] hover:bg-blue-600 text-slate-200 hover:text-white p-2 rounded flex items-center justify-center transition-colors border border-[#334155]"
              >
                <Compass size={16} />
              </button>
              <button
                onClick={() => leafletMap.current?.panBy([150, 0])}
                title="Pan East (Right)"
                className="bg-[#1e293b] hover:bg-blue-600 text-slate-200 hover:text-white p-2 rounded flex items-center justify-center transition-colors border border-[#334155]"
              >
                <ChevronRight size={16} />
              </button>
              <div></div>
              <button
                onClick={() => leafletMap.current?.panBy([0, 150])}
                title="Pan South (Down)"
                className="bg-[#1e293b] hover:bg-blue-600 text-slate-200 hover:text-white p-2 rounded flex items-center justify-center transition-colors border border-[#334155]"
              >
                <ChevronDown size={16} />
              </button>
              <div></div>
            </div>
            <div className="flex gap-1.5 w-full mt-1">
              <button
                onClick={() => leafletMap.current?.zoomIn()}
                className="flex-1 bg-[#1e293b] hover:bg-blue-600 text-slate-200 hover:text-white py-1.5 rounded text-[11px] font-mono font-bold flex items-center justify-center gap-1 border border-[#334155]"
              >
                <ZoomIn size={13} /> +
              </button>
              <button
                onClick={() => leafletMap.current?.zoomOut()}
                className="flex-1 bg-[#1e293b] hover:bg-blue-600 text-slate-200 hover:text-white py-1.5 rounded text-[11px] font-mono font-bold flex items-center justify-center gap-1 border border-[#334155]"
              >
                <ZoomOut size={13} /> -
              </button>
            </div>
          </div>
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
