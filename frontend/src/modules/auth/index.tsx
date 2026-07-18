import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { Lock, User, AlertCircle } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username, password);
      navigate("/dashboard");
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

  const autofill = () => {
    setUsername("ksp_admin");
    setPassword("change_me");
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#070b13] p-4 select-none">
      <div className="w-full max-w-md bg-[#0d1322] border border-[#1e293b] rounded p-8 shadow-2xl relative">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-xl tracking-wider mb-3">
            KSP
          </div>
          <h2 className="text-lg font-bold text-slate-100 tracking-tight leading-tight text-center">
            KSP Crime Intelligence Platform
          </h2>
          <span className="text-xs text-blue-500 font-mono tracking-widest uppercase mt-1">
            Secure Entry Gateway
          </span>
        </div>

        {error && (
          <div className="mb-5 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded text-xs flex items-start gap-2.5 leading-relaxed">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
              Officer Username
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. ksp_admin"
                className="w-full bg-[#111827] border border-[#1e293b] text-slate-200 text-xs rounded pl-9 pr-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <User className="absolute left-3 top-3 text-slate-500" size={14} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
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
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors mt-2"
          >
            {loading ? "Decrypting Credentials..." : "Authenticate Session"}
          </button>
        </form>

        <div className="mt-8 border-t border-[#1e293b] pt-4 text-center">
          <p className="text-[10px] text-slate-500 leading-normal mb-2">
            Authorized Karnataka State Police personnel only. System access is fully audited under IPC.
          </p>
          <button
            onClick={autofill}
            className="text-[10px] text-blue-500 hover:underline font-mono bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20"
          >
            Autofill Seeded Credentials
          </button>
        </div>
      </div>
    </div>
  );
}
