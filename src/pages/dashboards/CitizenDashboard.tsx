import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Bell, Map, FileText, Bot, User,
  Droplets, LogOut, MessageCircle, X, Send,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import DashOverview from "@/components/dashboard/citizen/sections/DashOverview";
import AlertsSection from "@/components/dashboard/citizen/sections/AlertsSection";
import HealthMapSection from "@/components/dashboard/citizen/sections/HealthMapSection";
import ReportsSection from "@/components/dashboard/citizen/sections/ReportsSection";
import ChatbotSection from "@/components/dashboard/citizen/sections/ChatbotSection";
import ProfileSection from "@/components/dashboard/citizen/sections/ProfileSection";

type Section = "dashboard" | "alerts" | "map" | "reports" | "chatbot" | "profile";

const NAV_ITEMS: { id: Section; icon: typeof LayoutDashboard; label: string }[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "alerts", icon: Bell, label: "Alerts" },
  { id: "map", icon: Map, label: "Health Map" },
  { id: "reports", icon: FileText, label: "Reports" },
  { id: "chatbot", icon: Bot, label: "AI Chatbot" },
  { id: "profile", icon: User, label: "Profile" },
];

// Greet by time-of-day
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Floating Chatbot FAB + Mini Modal ──────────────────────────────────────
function ChatFAB({ onNavigate }: { onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { side: "bot", text: "Hello! 👋 How can I help you today?" },
  ]);

  const send = () => {
    if (!input.trim()) return;
    setMessages((m) => [...m, { side: "user", text: input }]);
    const q = input;
    setInput("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        { side: "bot", text: `I'll help with that. For full AI capabilities, use the AI Chatbot section. You asked: "${q}"` },
      ]);
    }, 800);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {/* Mini chat modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden mb-2"
          >
            <div className="bg-[#0D1F1A] p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-[#4ADE80]" />
                <span className="text-white text-sm font-semibold">Sanjeevani AI</span>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              </div>
              <div className="flex gap-2">
                <button onClick={onNavigate} className="text-[10px] text-[#4ADE80] font-medium hover:text-white transition-colors">
                  Full Chat →
                </button>
                <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-3 h-44 overflow-y-auto space-y-2">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.side === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`text-xs rounded-xl px-3 py-2 max-w-[80%] ${
                      m.side === "bot" ? "bg-gray-100 text-gray-700" : "bg-[#0D7A4A] text-white"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-100 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask anything..."
                className="flex-1 px-3 py-1.5 rounded-full border border-gray-200 text-xs focus:outline-none"
              />
              <button onClick={send} className="w-7 h-7 rounded-full bg-[#0D7A4A] text-white flex items-center justify-center">
                <Send className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white animate-float-bounce"
        style={{ background: "linear-gradient(135deg, #0D7A4A, #2ED8A3)" }}
        aria-label="Open AI Chatbot"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </motion.button>
    </div>
  );
}

// ─── Main Dashboard Shell ────────────────────────────────────────────────────
export default function CitizenDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<Section>("dashboard");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard": return <DashOverview />;
      case "alerts":    return <AlertsSection />;
      case "map":       return <HealthMapSection />;
      case "reports":   return <ReportsSection />;
      case "chatbot":   return <ChatbotSection />;
      case "profile":   return <ProfileSection />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F4F6F5] overflow-hidden">

      {/* ════════════ SIDEBAR (fixed, 240px) ════════════ */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-[#0D1F1A] h-screen overflow-y-auto">
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/8">
          <div className="w-8 h-8 rounded-lg bg-[#22C55E]/20 border border-white/10 flex items-center justify-center">
            <Droplets className="w-4 h-4 text-[#4ADE80]" />
          </div>
          <span className="font-display text-lg font-bold text-white">Sanjeevani</span>
        </div>

        {/* User card */}
        <div className="px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2ED8A3]/20 border border-white/10 flex items-center justify-center text-white font-bold text-sm shrink-0">
              RB
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight truncate">Rahul Bora</p>
              <span className="inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#2ED8A3]/20 text-[#2ED8A3] border border-[#2ED8A3]/30">
                Citizen
              </span>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  isActive
                    ? "bg-[#1A3D2B] text-[#2ED8A3] border-l-2 border-[#2ED8A3]"
                    : "text-white/55 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#2ED8A3]" : ""}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* ════════════ MAIN CONTENT AREA ════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between shrink-0">
          <h2 className="font-display text-2xl font-bold text-[#0D1F1A]">
            {getGreeting()}, Rahul 👋
          </h2>
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <div className="relative">
              <button className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
                <Bell className="w-4.5 h-4.5" />
              </button>
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">3</span>
            </div>
            {/* AI Assistant button */}
            <button
              onClick={() => setActiveSection("chatbot")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ background: "linear-gradient(135deg, #0D7A4A, #2ED8A3)" }}
            >
              <Bot className="w-4 h-4" />
              AI Assistant
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-amber-200 bg-amber-50 px-5 py-2 text-xs text-amber-950">
          <span><strong>Demo UI:</strong> cases, alerts and maps here are sample content.</span>
          <button type="button" onClick={() => navigate("/ml-lab")} className="font-semibold underline">Open synthetic ML Lab</button>
        </div>

        {/* Scrollable section content */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="p-6 md:p-8 min-h-full"
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Floating chatbot FAB — shown on all sections except chatbot */}
      {activeSection !== "chatbot" && (
        <ChatFAB onNavigate={() => setActiveSection("chatbot")} />
      )}

      {/* ════════════ MOBILE BOTTOM TAB BAR ════════════ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0D1F1A] border-t border-white/10 grid grid-cols-5 px-2 py-2">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-lg transition-colors ${
                isActive ? "text-[#2ED8A3]" : "text-white/40 hover:text-white/70"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium leading-none">{item.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
