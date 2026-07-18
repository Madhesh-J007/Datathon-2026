import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { intelligenceService } from "../../services/intelligenceService";
import { hotspotService } from "../../services/hotspotService";
import TrendChart from "../../components/charts/TrendChart";
import { ShieldAlert, Compass } from "lucide-react";

export default function Predictive() {
  const [horizon, setHorizon] = useState(30);

  // Fetch crime trend forecast
  const { data: forecastData, isLoading: isForecastLoading } = useQuery({
    queryKey: ["crimeTrendForecast", horizon],
    queryFn: () => intelligenceService.getCrimeTrendForecast(horizon),
  });

  // Fetch predicted hotspots
  const { data: predictedHotspots, isLoading: isHotspotsLoading } = useQuery({
    queryKey: ["predictiveHotspots"],
    queryFn: () => hotspotService.getPredictedHotspots(),
  });

  const hotspots = predictedHotspots?.hotspots || [];
  const forecastPoints = forecastData?.points || [];

  // ECharts line option for forecast
  const forecastChartOptions = {
    title: { text: `${horizon}-Day Crime Trend Forecast` },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: forecastPoints.map((p: any) => p.date),
      axisLabel: { color: "#94a3b8" }
    },
    yAxis: { type: "value", axisLabel: { color: "#94a3b8" } },
    series: [
      {
        data: forecastPoints.map((p: any) => p.predicted_count),
        type: "line",
        smooth: true,
        color: "#ef4444",
        areaStyle: {
          color: "rgba(239, 68, 68, 0.1)"
        }
      },
    ],
  };

  return (
    <div className="space-y-6 select-none">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Predictive Intelligence Center</h1>
          <p className="text-xs text-slate-400 mt-1">AI-driven forecasts and resource allocation strategies</p>
        </div>
        
        <div className="flex gap-2">
          {[7, 30, 90].map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all border ${
                horizon === h
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-[#111827] text-slate-400 border-[#1e293b] hover:bg-[#1a2333]"
              }`}
            >
              {h} Days
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#111827] border border-[#1e293b] rounded p-5">
        <TrendChart options={forecastChartOptions} loading={isForecastLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emerging Crime Trends */}
        <div className="bg-[#111827] border border-[#1e293b] rounded p-5 flex flex-col h-[350px]">
          <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3 mb-4">
            <ShieldAlert className="text-red-400" size={16} />
            <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
              Emerging Crime Head Risks
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 text-xs">
            <div className="p-3 bg-red-500/5 border border-red-500/10 rounded flex justify-between items-center">
              <div>
                <h4 className="font-semibold text-slate-200">Residential Burglary</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">High probability spikes detected between 02:00 - 05:00</p>
              </div>
              <span className="text-red-400 font-mono font-bold bg-red-500/10 px-1.5 py-0.5 rounded text-[10px] border border-red-500/20">
                CRITICAL TREND
              </span>
            </div>
            <div className="p-3 bg-amber-500/5 border border-[#1e293b] rounded flex justify-between items-center">
              <div>
                <h4 className="font-semibold text-slate-200">Cyber Phishing Scams</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">District 2 indicates 24% surge in synthetic profiles</p>
              </div>
              <span className="text-amber-400 font-mono font-bold bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px] border border-amber-500/20">
                INCREASING
              </span>
            </div>
          </div>
        </div>

        {/* Resource Patrol Deployment Recommender */}
        <div className="bg-[#111827] border border-[#1e293b] rounded p-5 flex flex-col h-[350px]">
          <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3 mb-4">
            <Compass className="text-blue-400" size={16} />
            <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
              Suggested Patrol Deployments
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 text-xs">
            {isHotspotsLoading ? (
              <div className="text-center text-xs text-slate-500 py-8 font-mono">Running routing optimizer...</div>
            ) : hotspots.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-8 font-mono">No predictive hotspot routes generated.</div>
            ) : (
              hotspots.map((h: any, idx: number) => (
                <div key={idx} className="p-3 bg-blue-500/5 border border-blue-500/10 rounded flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-slate-200">Patrol Route Target #{idx + 1}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Coordinates: {h.latitude.toFixed(4)} N, {h.longitude.toFixed(4)} E</p>
                    <p className="text-[9px] text-slate-500 font-mono mt-1">Factors: {h.top_factors?.join(", ")}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-300 font-mono">Confidence</span>
                    <span className="text-blue-400 font-mono font-bold text-sm">{(h.confidence * 100).toFixed(0)}%</span>
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

