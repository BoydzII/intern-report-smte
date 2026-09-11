"use client";

import { useEffect, useState } from "react";
import { Lock, LogOut } from "lucide-react";

// รหัสผ่านเริ่มต้นสำหรับแอดมิน (สามารถเปลี่ยนตรงนี้ หรือตั้งใน Environment Variable: NEXT_PUBLIC_ADMIN_PIN ได้ครับ)
const DEFAULT_PIN = "1234";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = sessionStorage.getItem("admin_auth");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = process.env.NEXT_PUBLIC_ADMIN_PIN || DEFAULT_PIN;
    if (pin === correctPin) {
      sessionStorage.setItem("admin_auth", "true");
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
      setPin("");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_auth");
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return <div className="text-center py-20 text-gray-400">กำลังตรวจสอบสิทธิ์...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">เข้าสู่ระบบอาจารย์ / แอดมิน</h2>
          <p className="text-gray-500 text-sm mb-6">พื้นที่นี้สำหรับอาจารย์ผู้ดูแลเท่านั้น กรุณากรอกรหัสผ่าน</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="กรอกรหัสผ่าน (PIN)"
                className="w-full text-center text-xl tracking-widest bg-white text-gray-900 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
                autoFocus
                required
              />
            </div>
            {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition shadow-md active:scale-95"
            >
              ยืนยันรหัสผ่าน
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-4">รหัสเริ่มต้น: <span className="font-mono font-bold text-gray-600">1234</span></p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="print:hidden flex justify-end mb-2">
        <button
          onClick={handleLogout}
          className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm transition hover:bg-red-50"
        >
          <LogOut size={14} />
          <span>ออกจากระบบแอดมิน</span>
        </button>
      </div>
      {children}
    </div>
  );
}
