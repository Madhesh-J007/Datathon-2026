import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { Lock, User, AlertCircle, ShieldCheck, Key, ArrowRight } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent, uOverride?: string, pOverride?: string) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);

    const u = uOverride || username;
    const p = pOverride || password;

    try {
      await login(u, p);
      if (u.includes("cbi") || u.includes("fsl") || u.includes("ed")) {
        navigate("/collaboration");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error("Login error details:", err);
      const detail = err.response?.data?.detail;
      if (detail) {
        setError(detail);
      } else if (err.message) {
        setError(`Backend Connection Error (${err.message}). Ensure backend container is running.`);
      } else {
        setError("Authentication failed. Please verify connection & credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInstantPreset = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    handleSubmit(undefined, u, p);
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#070b13] p-4 select-none font-sans">
      <div className="w-full max-w-xl bg-[#0d1322] border border-[#1e293b] rounded-lg p-8 shadow-2xl relative space-y-5">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-xl tracking-wider mb-2 shadow-lg shadow-blue-600/30">
            KSP
          </div>
          <h2 className="text-base font-bold text-slate-100 tracking-tight leading-tight text-center font-mono uppercase">
            Karnataka State Police Crime Intelligence Platform
          </h2>
          <span className="text-xs text-blue-400 font-mono tracking-widest uppercase mt-1 flex items-center gap-1">
            <ShieldCheck size={13} />
            Unified Authentication Portal
          </span>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded text-xs flex items-start gap-2.5 leading-relaxed font-mono">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* PROMINENT CREDENTIALS CARD */}
        <div className="bg-[#151c2e] border border-[#1e293b] p-4 rounded-xl text-xs font-mono space-y-3">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
            <span className="text-amber-400 font-bold flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <Key size={14} />
              Appointed Officers Credentials Directory (Click to Login Instantly):
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-[11px]">
            {/* 1. Bharathvaj DGP */}
            <button
              onClick={() => handleInstantPreset("Bharathvaj", "change_me")}
              className="bg-[#0f172a] hover:bg-blue-600/20 border border-blue-500/30 hover:border-blue-400 p-2.5 rounded-lg text-left transition-all group"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-blue-400">🏛️ Bharathvaj (DGP)</span>
                <ArrowRight size={12} className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-slate-300 mt-1">ID: <span className="text-amber-300 font-bold">Bharathvaj</span></p>
              <p className="text-slate-400">Pass: <span className="text-emerald-400 font-bold">change_me</span></p>
              <span className="text-[9px] text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">Statewide Command</span>
            </button>

            {/* 2. Ramesh SP */}
            <button
              onClick={() => handleInstantPreset("ramesh", "change_me")}
              className="bg-[#0f172a] hover:bg-blue-600/20 border border-blue-500/30 hover:border-blue-400 p-2.5 rounded-lg text-left transition-all group"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-blue-400">⭐ Ramesh (SP)</span>
                <ArrowRight size={12} className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-slate-300 mt-1">ID: <span className="text-amber-300 font-bold">ramesh</span></p>
              <p className="text-slate-400">Pass: <span className="text-emerald-400 font-bold">change_me</span></p>
              <span className="text-[9px] text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">Statewide SP Command</span>
            </button>

            {/* 3. Suda Constable */}
            <button
              onClick={() => handleInstantPreset("suda", "change_me")}
              className="bg-[#0f172a] hover:bg-cyan-600/20 border border-cyan-500/30 hover:border-cyan-400 p-2.5 rounded-lg text-left transition-all group"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-cyan-400">👮 Suda (Constable)</span>
                <ArrowRight size={12} className="text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-slate-300 mt-1">ID: <span className="text-amber-300 font-bold">suda</span></p>
              <p className="text-slate-400">Pass: <span className="text-emerald-400 font-bold">change_me</span></p>
              <span className="text-[9px] text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">Station Scope Only</span>
            </button>

            {/* 4. System Admin */}
            <button
              onClick={() => handleInstantPreset("ksp_admin", "change_me")}
              className="bg-[#0f172a] hover:bg-purple-600/20 border border-purple-500/30 hover:border-purple-400 p-2.5 rounded-lg text-left transition-all group"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-purple-400">⚙️ System Admin</span>
                <ArrowRight size={12} className="text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-slate-300 mt-1">ID: <span className="text-amber-300 font-bold">ksp_admin</span></p>
              <p className="text-slate-400">Pass: <span className="text-emerald-400 font-bold">change_me</span></p>
              <span className="text-[9px] text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">Admin Console Access</span>
            </button>

            {/* 5. CBI Officer */}
            <button
              onClick={() => handleInstantPreset("cbi_sp_verma", "cbi@password2026")}
              className="bg-[#0f172a] hover:bg-amber-600/20 border border-amber-500/30 hover:border-amber-400 p-2.5 rounded-lg text-left transition-all group"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-amber-400">🕵️ CBI Officer (Verma)</span>
                <ArrowRight size={12} className="text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-slate-300 mt-1">ID: <span className="text-amber-300 font-bold">cbi_sp_verma</span></p>
              <p className="text-slate-400">Pass: <span className="text-emerald-400 font-bold">cbi@password2026</span></p>
              <span className="text-[9px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">Federal Intelligence</span>
            </button>

            {/* 6. FSL Officer */}
            <button
              onClick={() => handleInstantPreset("fsl_dna_sunita", "fsl@password2026")}
              className="bg-[#0f172a] hover:bg-emerald-600/20 border border-emerald-500/30 hover:border-emerald-400 p-2.5 rounded-lg text-left transition-all group"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-emerald-400">🧪 Forensic (Sunita)</span>
                <ArrowRight size={12} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-slate-300 mt-1">ID: <span className="text-amber-300 font-bold">fsl_dna_sunita</span></p>
              <p className="text-slate-400">Pass: <span className="text-emerald-400 font-bold">fsl@password2026</span></p>
              <span className="text-[9px] text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">DNA & Lab Analysis</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
              Manual Officer User ID / Code
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. ksp_admin, cbi_sp_verma"
                className="w-full bg-[#111827] border border-[#1e293b] text-slate-200 text-xs rounded pl-9 pr-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <User className="absolute left-3 top-3 text-slate-500" size={14} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
              Security Code / Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#111827] border border-[#1e293b] text-slate-200 text-xs rounded pl-9 pr-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <Lock className="absolute left-3 top-3 text-slate-500" size={14} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded py-2.5 text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-blue-600/20"
          >
            {loading ? "Decrypting Session..." : "Authenticate Session"}
          </button>
        </form>
      </div>
    </div>
  );
}
