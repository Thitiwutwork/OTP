import React, { useState, useEffect } from 'react';
import OtpMailboxPage from './components/OtpMailboxPage';
import Toast from './components/Toast';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import { checkAdminSession, touchAdminSession, adminLogout, createAdminSession } from './services/adminService';

export default function App() {
  const [toast, setToast] = useState({ isVisible: false, message: '', icon: '✨' });

  // Read secret admin entrance from URL (?key=backendscrect or /backendscrect or /admin)
  const checkInitialAdmin = () => {
    try {
      if (checkAdminSession()) return true;

      const params = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname.toLowerCase();

      const secretKey = 'backendscrect';
      const altSecretKey = 'backendsecret';

      // 1. Direct secret in URL -> Auto login directly!
      const hasSecretParam = 
        params.get('key')?.toLowerCase() === secretKey ||
        params.get('key')?.toLowerCase() === altSecretKey ||
        params.get('secret')?.toLowerCase() === secretKey ||
        params.get('secret')?.toLowerCase() === altSecretKey ||
        params.get('admin')?.toLowerCase() === secretKey ||
        params.get('admin')?.toLowerCase() === altSecretKey ||
        params.has(secretKey) ||
        params.has(altSecretKey);

      const hasSecretPath = 
        pathname === `/${secretKey}` ||
        pathname === `/${altSecretKey}` ||
        pathname.startsWith(`/${secretKey}/`) ||
        pathname.startsWith(`/${altSecretKey}/`);

      if (hasSecretParam || hasSecretPath) {
        createAdminSession(); // Auto-login immediately
        window.history.replaceState({}, '', '/');
        return true;
      }

      // 2. Standard admin entrance -> Shows AdminLogin modal
      if (params.get('admin') === 'true' || params.has('admin') || pathname.startsWith('/admin')) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  };

  const getInitialEmailFromUrl = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('email') || '';
    } catch {
      return '';
    }
  };

  const [initialEmail] = useState(getInitialEmailFromUrl);
  const [isAdminMode, setIsAdminMode] = useState(checkInitialAdmin);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(checkAdminSession);

  // Auto Inactivity Monitor for Maximum Admin Security (15 min auto-logout)
  useEffect(() => {
    if (!isAdminMode || !isAdminLoggedIn) return;

    const handleUserActivity = () => {
      touchAdminSession();
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    // Check expiration every 20 seconds
    const interval = setInterval(() => {
      if (!checkAdminSession()) {
        adminLogout();
        setIsAdminLoggedIn(false);
        showToast('เซสชันแอดมินหมดอายุเนื่องจากไม่มีการใช้งานเกิน 15 นาที เพื่อความปลอดภัยสูงสุด', '🔒');
      }
    }, 20000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      clearInterval(interval);
    };
  }, [isAdminMode, isAdminLoggedIn]);

  const handleExitAdmin = () => {
    adminLogout();
    setIsAdminLoggedIn(false);
    setIsAdminMode(false);
    // Securely clear query parameter from browser address bar and history
    window.history.replaceState({}, '', '/');
  };

  const showToast = (message, icon = '✨') => {
    setToast({ isVisible: true, message, icon });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, isVisible: false }));
    }, 4000);
  };

  // If in Admin Mode
  if (isAdminMode) {
    if (!isAdminLoggedIn) {
      return (
        <AdminLogin
          onLoginSuccess={() => {
            setIsAdminLoggedIn(true);
            showToast('เข้าสู่ระบบแอดมินสำเร็จ (ความปลอดภัยระดับสูงสุด)', '🛡️');
          }}
          onCancel={handleExitAdmin}
        />
      );
    }
    return <AdminDashboard onExitToClient={handleExitAdmin} />;
  }

  // Client OTP Search Mode
  return (
    <div className="min-h-screen bg-[#F0F6FF] flex flex-col justify-between font-['Prompt'] text-slate-700 selection:bg-sky-200 selection:text-sky-900">
      
      {/* Standalone Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-sky-100 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-xs ring-2 ring-sky-200 bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-xl tracking-tighter shadow-sky-500/20">
              <span>N</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent font-['Prompt']">
                  NAME
                </span>
                <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-md">
                  Mailbox OTP
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-500 font-normal">ระบบดึงรหัสยืนยัน OTP อัตโนมัติ 24 ชม.</p>
            </div>
          </div>

        </div>
      </header>

      {/* Main Mailbox Content */}
      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-10 w-full flex-1">
        <OtpMailboxPage
          initialEmail={initialEmail}
          onShowToast={showToast}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-sky-100 bg-white/80 py-6 text-center text-xs text-gray-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 NAME — ระบบอัตโนมัติ 24 ชม.</span>
          <div className="flex items-center gap-3 text-gray-400">
            <span>ให้บริการกล่องข้อความและรับรหัส OTP อย่างปลอดภัย</span>
            <button
              type="button"
              onClick={() => setIsAdminMode(true)}
              className="text-gray-300 hover:text-sky-600 transition-colors cursor-pointer text-xs p-0.5 rounded-sm"
              title="เข้าสู่ระบบจัดการแอดมิน"
            >
              🔒
            </button>
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        icon={toast.icon}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />

    </div>
  );
}
