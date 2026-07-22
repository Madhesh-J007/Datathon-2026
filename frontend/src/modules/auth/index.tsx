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
      console.error(err);
      setError(
        err.response?.data?.detail || 
        "Authentication failed. Please verify credentials."
      );
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
        <div className="bg-[#151c2e] border border-[#1e293b] p-3.5 rounded text-xs font-mono space-y-2">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
            <span className="text-amber-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
              <Key size={14} />
              Development & Evaluation Credentials (Click Any to Login Instantly):
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <button
              onClick={() => handleInstantPreset("ksp_admin", "change_me")}
              className="bg-[#0f172a] hover:bg-blue-600/20 border border-blue-500/30 hover:border-blue-400 p-2.5 rounded text-left transition-all group"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-blue-400">⚙️ KSP System Admin</span>
                <ArrowRight size={12} className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-slate-300 mt-1">User ID: <span className="text-amber-300 font-bold">ksp_admin</span></p>
              <p className="text-slate-400">Password: <span className="text-emerald-400 font-bold">change_me</span></p>
            </button>

            <button
              onClick={() => handleInstantPreset("cbi_sp_verma", "cbi@password2026")}
              className="bg-[#0f172a] hover:bg-amber-600/20 border border-amber-500/30 hover:border-amber-400 p-2.5 rounded text-left transition-all group"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-amber-400">🕵️ CBI Officer (Verma)</span>
                <ArrowRight size={12} className="text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-slate-300 mt-1">User ID: <span className="text-amber-300 font-bold">cbi_sp_verma</span></p>
              <p className="text-slate-400">Password: <span className="text-emerald-400 font-bold">cbi@password2026</span></p>
            </button>

            <button
              onClick={() => handleInstantPreset("fsl_dna_sunita", "fsl@password2026")}
              className="bg-[#0f172a] hover:bg-purple-600/20 border border-purple-500/30 hover:border-purple-400 p-2.5 rounded text-left transition-all group"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-purple-400">🧪 KSCFSL Forensic (Sunita)</span>
                <ArrowRight size={12} className="text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-slate-300 mt-1">User ID: <span className="text-amber-300 font-bold">fsl_dna_sunita</span></p>
              <p className="text-slate-400">Password: <span className="text-emerald-400 font-bold">fsl@password2026</span></p>
            </button>

            <button
              onClick={() => handleInstantPreset("ed_jd_hegde", "ed@password2026")}
              className="bg-[#0f172a] hover:bg-emerald-600/20 border border-emerald-500/30 hover:border-emerald-400 p-2.5 rounded text-left transition-all group"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-emerald-400">💼 ED Financial (Hegde)</span>
                <ArrowRight size={12} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-slate-300 mt-1">User ID: <span className="text-amber-300 font-bold">ed_jd_hegde</span></p>
              <p className="text-slate-400">Password: <span className="text-emerald-400 font-bold">ed@password2026</span></p>
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
