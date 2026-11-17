import { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Send, Stethoscope } from "lucide-react";
import { useMl, useUnitHistory } from "@/lib/ml/MlContext";
import { areaReply, buildChatContext, contextAsPrompt, hotspotReply, waterReply, SYNTHETIC_NOTE, type ChatContext } from "@/lib/ml/chatContext";
import { TASK_META, TIER_META, formatInt, formatScore, formatWeek, tierCounts, unitName, unitScore, unitTier } from "@/lib/ml/risk";
import type { History } from "@/lib/ml/types";

type MessageSide = "bot" | "user";
interface Message { id: number; side: MessageSide; text: string }

const QUICK_REPLIES = ["📊 Case trends?", "🗺️ Review list?", "💊 Cholera protocol?", "💧 Water inputs?", "📢 Draft advisory?"];

const CHOLERA_PROTOCOL = `💊 General cholera / acute watery diarrhea response (not model output):\n\n1. Start ORS immediately; use IV fluids for severe dehydration\n2. Refer severe cases to the nearest facility the same day\n3. Record the case and tell the PHC medical officer\n4. Check the household and neighbours for similar symptoms\n5. Advise boiled or chlorinated water and hand washing\n6. Report any cluster to the supervisor straight away\n\nFollow your state's official guidelines for clinical decisions.`;

function trendReply(history: History | undefined, label: string): string {
  const points = history?.points.slice(-5) ?? [];
  if (points.length === 0) return "I can't see any weekly history right now. Please start the local ML service or load the saved run.";
  const lines = points.map((p) => `• ${formatWeek(p.date)}: ${formatInt(p.signals.asha_cases_7d)} ASHA-reported, ${formatInt(p.signals.opd_cases_7d)} OPD`);
  const last = points[points.length - 1].signals.asha_cases_7d;
  const before = points.length > 1 ? points[points.length - 2].signals.asha_cases_7d : null;
  const change = last != null && before != null ? `\nChange vs previous week: ${last - before >= 0 ? "+" : ""}${formatInt(last - before)} ASHA-reported cases.` : "";
  return `📊 Weekly counts for ${label} (last ${points.length} weeks):\n\n${lines.join("\n")}${change}\n\nThese are the case counts the model reads as input.\n\n${SYNTHETIC_NOTE}`;
}

export default function AshaChat() {
  const { board, units, homeUnit } = useMl();
  const { history } = useUnitHistory(homeUnit, 6);
  const ctx = useMemo(() => buildChatContext(board, units, homeUnit), [board, units, homeUnit]);
  const home = board?.units.find((u) => u.unit_id === homeUnit);
  const counts = tierCounts(board, "m1");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1, side: "bot",
      text: "Hello Priya! 👋 I can read the saved synthetic model results for your coverage area and share general field protocols.\n\nTry a quick question below.\n\nℹ️ Every risk number here comes from a simulated experiment.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  const quickReply = (text: string, c: ChatContext | null): string => {
    switch (text) {
      case "📊 Case trends?": return trendReply(history, unitName(units, homeUnit));
      case "🗺️ Review list?": return hotspotReply(c, "m1");
      case "💊 Cholera protocol?": return CHOLERA_PROTOCOL;
      case "💧 Water inputs?": return waterReply(c);
      case "📢 Draft advisory?": {
        const tier = unitTier(home, home?.m1 ? "m1" : "m2") ?? "routine";
        return `📢 Draft advisory (${TIER_META[tier].label} tier for ${unitName(units, homeUnit)}):\n\n"Please boil or treat drinking water, wash hands with soap, keep ORS at home and tell your ASHA worker early about diarrhea or vomiting."\n\nThis is general prevention advice. Nothing is sent from this demo.\n\n${areaReply(c).split("\n").slice(0, 3).join("\n")}`;
      }
      default: return `I can answer about case trends, the review list, water inputs, the cholera protocol and drafting an advisory.\n\n${SYNTHETIC_NOTE}`;
    }
  };

  const send = async (text: string) => {
    if (!text.trim()) return;
    setMessages(m => [...m, { id: Date.now(), side: "user", text }]);
    setInput("");

    const isQuick = QUICK_REPLIES.includes(text);
    if (isQuick || !GEMINI_API_KEY) {
      const reply = isQuick ? quickReply(text, ctx) : `The optional demo chat is not configured on this device, so I can only answer the quick questions.\n\n${SYNTHETIC_NOTE}`;
      setMessages(m => [...m, { id: Date.now() + 1, side: "bot", text: reply }]);
      return;
    }

    setIsTyping(true);
    try {
      const systemInstruction = contextAsPrompt("ASHA worker", ctx) + "\nFormat nicely with short markdown and emojis. Give practical field advice.";
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text }] }],
        }),
      });

      if (!res.ok) throw new Error("API Error");
      const data = await res.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that.";
      setMessages(m => [...m, { id: Date.now() + 1, side: "bot", text: responseText }]);
    } catch (e) {
      console.error(e);
      setMessages(m => [...m, { id: Date.now() + 1, side: "bot", text: "Connection error. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-0">
      <div className="mb-5">
        <h2 className="font-display text-[24px] font-bold text-[#0D1F1A]">Sanjeevani Field Assistant</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-sm text-gray-600 font-medium">
            {GEMINI_API_KEY ? "Demo key configured (open questions go to an external AI service)" : "Quick questions only (no demo key configured)"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col" style={{ height: 580 }}>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-start gap-3 ${msg.side === "user" ? "flex-row-reverse" : ""}`}>
                {msg.side === "bot" && (
                  <div className="w-8 h-8 rounded-full bg-[#E8F5EE] border border-[#C8EBD8] flex items-center justify-center shrink-0 mt-0.5">
                    <Stethoscope className="w-4 h-4 text-[#0D7A4A]" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${msg.side === "bot" ? "bg-gray-50 text-gray-700 rounded-tl-none" : "bg-[#0D7A4A] text-white rounded-tr-none"}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E8F5EE] border border-[#C8EBD8] flex items-center justify-center">
                  <Stethoscope className="w-4 h-4 text-[#0D7A4A]" />
                </div>
                <div className="bg-gray-50 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <motion.div key={i} className="w-2 h-2 rounded-full bg-[#0D7A4A]" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, delay, repeat: Infinity }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-gray-50 no-scrollbar">
            {QUICK_REPLIES.map(qr => (
              <button key={qr} onClick={() => send(qr)} className="shrink-0 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-600 hover:border-[#0D7A4A] hover:text-[#0D7A4A] transition-colors bg-white">{qr}</button>
            ))}
          </div>
          <div className="p-4 border-t border-gray-100 flex gap-3">
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send(input)}
              placeholder="Ask about your area, the review list or protocols…"
              className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7A4A]/20" />
            <button onClick={() => send(input)} className="w-10 h-10 rounded-full bg-[#0D7A4A] text-white flex items-center justify-center hover:bg-[#0D1F1A] transition-colors shrink-0" aria-label="Send">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h4 className="font-display font-bold text-[#0D1F1A] mb-3 text-sm">Your Coverage Summary</h4>
            <div className="space-y-2.5">
              {[
                { label: "ASHA-reported cases (7d)", value: formatInt(home?.signals.asha_cases_7d), color: "#E53935" },
                { label: `${TASK_META.m1.short} score (your unit)`, value: formatScore(unitScore(home, "m1")), color: "#0D1F1A" },
                { label: "Units in review (all)", value: String(counts.review), color: "#E53935" },
                { label: "Units on watch (all)", value: String(counts.watch), color: "#FB8C00" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">{s.label}</span>
                  <span className="font-mono font-bold text-sm" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-gray-400">Week of {formatWeek(board?.date)} · saved synthetic run</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h4 className="font-display font-bold text-[#0D1F1A] mb-3 text-sm">Field Protocols</h4>
            <div className="space-y-2">
              {[{ icon: "🦠", label: "Cholera response →", color: "#E53935", q: "💊 Cholera protocol?" }, { icon: "💧", label: "Water inputs this week →", color: "#1565C0", q: "💧 Water inputs?" }, { icon: "📢", label: "Draft community advisory →", color: "#FB8C00", q: "📢 Draft advisory?" }].map(p => (
                <button key={p.label} onClick={() => send(p.q)} className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-left text-xs font-semibold hover:bg-gray-50 transition-colors border border-gray-100" style={{ color: p.color }}>
                  <span>{p.icon}</span>{p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h4 className="font-display font-bold text-[#0D1F1A] mb-3 text-sm">Contacts (demo placeholders)</h4>
            <div className="space-y-2.5">
              {[{ icon: "🏛️", label: "District Health Officer", number: "044-XXXX-XXXX" }, { icon: "🏥", label: "PHC Potheri", number: "044-XXXX-XXXX" }, { icon: "🆘", label: "State Health Helpline", number: "104" }].map(c => (
                <div key={c.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><span>{c.icon}</span><span className="text-xs font-medium text-[#0D1F1A]">{c.label}</span></div>
                  <span className="text-xs font-mono text-[#0D7A4A] font-semibold">{c.number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
