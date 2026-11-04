import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Microscope, BarChart2,
  Bot, User, LogOut, Bell, MessageCircle, X, Send, Stethoscope
} from "lucide-react";
import HospDashSection from "@/components/dashboard/hospital/sections/HospDashSection";
import HospPatients from "@/components/dashboard/hospital/sections/HospPatients";
import HospCases from "@/components/dashboard/hospital/sections/HospCases";
import HospReports from "@/components/dashboard/hospital/sections/HospReports";
import HospChat from "@/components/dashboard/hospital/sections/HospChat";
import HospProfile from "@/components/dashboard/hospital/sections/HospProfile";

type SectionId = "dashboard" | "patients" | "cases" | "reports" | "chatbot" | "profile";

const NAV_ITEMS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "patients", label: "Patients", icon: <Users className="w-4 h-4" /> },
  { id: "cases", label: "Cases", icon: <Microscope className="w-4 h-4" /> },
  { id: "reports", label: "Reports", icon: <BarChart2 className="w-4 h-4" /> },
  { id: "chatbot", label: "AI Chatbot", icon: <Bot className="w-4 h-4" /> },
  { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
];

const SECTION_COMPONENTS: Record<SectionId, React.ReactNode> = {
  dashboard: <HospDashSection />,
  patients: <HospPatients />,
  cases: <HospCases />,
  reports: <HospReports />,
  chatbot: <HospChat />,
  profile: <HospProfile />,
};

// ─── FAB mini chat ────────────────────────────────────────────────────────────
function MiniChatFAB({ onOpenFull }: { onOpenFull: () => void }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [replied, setReplied] = useState(false);

  const send = () => { if (!input.trim()) return; setReplied(true); setInput(""); };

  return (
    <div className="fixed bottom-8 right-8 z-40">
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-20 right-0 w-[320px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: "#0D1F1A" }}>
              <div className="flex items-center gap-2"><Stethoscope className="w-4 h-4 text-[#2ED8A3]" /><span className="text-white text-sm font-semibold">AI Assistant</span></div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 min-h-[100px] text-sm text-gray-600">
              {replied ? "CASE-066 (Sunita Borah, Severe Cholera) is currently hospitalized in Ward 3A. Treatment: IV fluids + Doxycycline. Last update: Mar 8, 14:00." : "Hello! Ask about cases, patients, or risk zones."}
            </div>
            <div className="p-3 border-t flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Quick question…"
                className="flex-1 px-3 py-2 rounded-full border border-gray-200 text-xs focus:outline-none" />
              <button onClick={send} className="w-8 h-8 rounded-full bg-[#1565C0] text-white flex items-center justify-center shrink-0">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="px-3 pb-3">
              <button onClick={onOpenFull} className="w-full py-2 rounded-xl text-xs font-semibold text-[#1565C0] border border-[#1565C0]/30 hover:bg-[#EFF6FF] transition-colors">Open Full AI Chatbot →</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button onClick={() => setOpen(!open)}
        animate={{ y: [0, -6, 0] }} transition={{ delay: 1.5, duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
        className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform"
        style={{ background: "linear-gradient(135deg, #1565C0 0%, #42A5F5 100%)" }}>
        <MessageCircle className="w-6 h-6" />
      </motion.button>
    </div>
  );
}

// ─── Onboarding strip ─────────────────────────────────────────────────────────
function OnboardingStrip() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("hosp_onboard_dismissed") === "true"; } catch { return false; }
  });

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem("hosp_onboard_dismissed", "true"); } catch { /* Storage may be unavailable in private mode. */ }
  };

  if (dismissed) return null;

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className="flex items-center gap-4 px-6 py-3 border-b"
      style={{ background: "#EFF6FF", borderBottomColor: "#BFDBFE" }}>
      <span className="text-2xl shrink-0">🏥</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1565C0]">Your Role: Disease Case Reporting & Patient Monitoring</p>
        <p className="text-xs text-[#1565C0]/70 mt-0.5">This dashboard uses sample cases. The separate ML Lab displays saved synthetic experiments.</p>
      </div>
      <button className="text-xs font-semibold text-[#1565C0] hover:underline shrink-0">Learn More</button>
      <button onClick={dismiss} className="p-1 rounded-lg hover:bg-blue-100 text-[#1565C0]/60 hover:text-[#1565C0] transition-colors shrink-0">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// ─── Main Shell ───────────────────────────────────────────────────────────────
export default function HospitalDashboard() {
  const [activeSection, setActiveSection] = useState<SectionId>("dashboard");
  const navigate = useNavigate();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6F5]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* ─── Sidebar ──────────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 flex flex-col h-full overflow-y-auto" style={{ background: "#0D1F1A" }}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 pt-6 pb-4">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 2C8.477 2 4 6.477 4 12c0 3.5 1.788 6.59 4.5 8.438V24a1.5 1.5 0 0 0 2.25 1.299L14 23.5l3.25 1.799A1.5 1.5 0 0 0 19.5 24v-3.562C22.212 18.59 24 15.5 24 12c0-5.523-4.477-10-10-10Z" fill="#2ED8A3" fillOpacity=".25" />
            <path d="M14 5c3.866 0 7 3.134 7 7 0 2.33-1.14 4.393-2.888 5.668" stroke="#2ED8A3" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M10 12h8M14 8v8" stroke="#2ED8A3" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-white text-xl font-bold" style={{ fontFamily: "'Fraunces', serif" }}>Sanjeevani</span>
        </div>

        {/* Hospital info */}
        <div className="mx-3 mb-1 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1565C0] flex items-center justify-center text-white text-sm font-bold shrink-0">GM</div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-xs leading-tight">Gauhati Medical College</p>
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1" style={{ background: "#1565C0", color: "#93C5FD" }}>Hospital</span>
            </div>
          </div>
        </div>
        {/* Subtitle */}
        <p className="px-4 pb-3 text-[11px] leading-snug" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans',sans-serif" }}>
          Monitor patients and report disease cases to the network
        </p>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button key={item.id} onClick={() => setActiveSection(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
                style={{
                  background: isActive ? "#1A3D2B" : "transparent",
                  color: isActive ? "#2ED8A3" : "rgba(255,255,255,0.7)",
                  borderLeft: isActive ? "3px solid #2ED8A3" : "3px solid transparent",
                  fontWeight: isActive ? 700 : 400,
                }}>
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-6 mt-4">
          <button onClick={() => navigate("/login")}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors"
            style={{ color: "#F87171" }}>
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* ─── Main Area ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Onboarding strip — only on dashboard section */}
        <AnimatePresence>{activeSection === "dashboard" && <OnboardingStrip />}</AnimatePresence>

        {/* Top bar */}
        <header className="shrink-0 bg-white border-b border-gray-100 px-8 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-display text-[22px] font-bold text-[#0D1F1A]">Gauhati Medical College</h1>
            <p className="text-xs text-gray-400 mt-0.5">Dispur, Guwahati · 781005</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#E53935] text-[9px] text-white font-bold flex items-center justify-center">4</span>
            </button>
            <button onClick={() => setActiveSection("chatbot")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #0D7A4A 0%, #22C55E 100%)" }}>
              <Bot className="w-4 h-4" /> AI Assistant
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-amber-200 bg-amber-50 px-5 py-2 text-xs text-amber-950">
          <span><strong>Demo UI:</strong> cases, alerts and reports here are sample content.</span>
          <button type="button" onClick={() => navigate("/ml-lab")} className="font-semibold underline">Open synthetic ML Lab</button>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div key={activeSection} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {SECTION_COMPONENTS[activeSection]}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* FAB — hidden when chatbot active */}
      {activeSection !== "chatbot" && <MiniChatFAB onOpenFull={() => setActiveSection("chatbot")} />}

      {/* Mobile bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0D1F1A] border-t border-white/10 flex lg:hidden z-30">
        {NAV_ITEMS.slice(0, 5).map(item => (
          <button key={item.id} onClick={() => setActiveSection(item.id)}
            className="flex-1 flex flex-col items-center py-3 gap-1 text-[10px] transition-colors"
            style={{ color: activeSection === item.id ? "#2ED8A3" : "rgba(255,255,255,0.5)" }}>
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
