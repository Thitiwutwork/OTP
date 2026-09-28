import React, { useState, useEffect } from "react";
import { Lock, User, ArrowRight, ShieldCheck, ArrowLeft, KeyRound, ShieldAlert, Timer } from "lucide-react";
import { verifyAdminLogin, getLockoutRemaining } from "../services/adminService";

export default function AdminLogin({ onLoginSuccess, onCancel }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutSecs, setLockoutSecs] = useState(getLockoutRemaining);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSecs <= 0) return;
    const t = setInterval(() => {
      setLockoutSecs((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [lockoutSecs]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (lockoutSecs > 0) {
      setError(`ระบบกำลังถูกระงับการเข้าสู่ระบบ กรุณารออีก ${lockoutSecs} วินาที`);
      return;
    }

    if (!username.trim() || !password.trim()) {
      setError("กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const result = verifyAdminLogin(username.trim(), password.trim());
      setIsLoading(false);

      if (result.success) {
        onLoginSuccess();
      } else {
        const remaining = getLockoutRemaining();
        if (remaining > 0) {
          setLockoutSecs(remaining);
        }
        setError(result.error || "รหัสผ่านไม่ถูกต้อง");
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 font-['Prompt']">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-10 relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Back Button */}
        <button
          onClick={onCancel}
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับหน้าหลัก
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 mx-auto mb-3 text-white">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            เข้าสู่ระบบจัดการแอดมิน
          </h2>
          <p className="text-xs text-gray-500 mt-1 font-semibold tracking-wide">
            NAME OTP & MAILBOX CONSOLE
          </p>
          <div className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>ระบบความปลอดภัยระดับสูงสุด (SSL & Brute-Force Guard)</span>
          </div>
        </div>

        {/* Lockout Warning */}
        {lockoutSecs > 0 && (
          <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-2xl flex items-center gap-2.5">
            <Timer className="w-5 h-5 text-amber-600 shrink-0 animate-spin" />
            <div>
              <p className="font-bold">ระบบถูกล็อกชั่วคราวเพื่อความปลอดภัย</p>
              <p className="text-[11px] text-amber-700">สามารถลองใหม่ได้ในอีก {lockoutSecs} วินาที</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && lockoutSecs <= 0 && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              ชื่อผู้ใช้งาน (Username)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                disabled={lockoutSecs > 0}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-50"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                disabled={lockoutSecs > 0}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-50"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || lockoutSecs > 0}
              className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 hover:from-sky-600 hover:to-indigo-800 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <span>กำลังตรวจสอบความปลอดภัย...</span>
              ) : lockoutSecs > 0 ? (
                <span>รอเวลาปลดล็อก ({lockoutSecs}s)...</span>
              ) : (
                <>
                  <span>เข้าสู่ระบบแดชบอร์ด</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <p className="text-[11px] text-gray-400">
            ระบบเซสชันอัตโนมัติ 15 นาที • บันทึกการเข้าใช้งานอย่างปลอดภัย
          </p>
        </div>

      </div>
    </div>
  );
}
