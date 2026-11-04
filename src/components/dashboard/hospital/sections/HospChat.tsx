import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Stethoscope } from "lucide-react";

type Side = "bot" | "user";
interface Message { id: number; side: Side; text: string }

const QUICK_REPLIES = ["ðŸ“Š Case summary?", "ðŸ—ºï¸ Risk zones?", "ðŸ¦  Cholera protocol?", "ðŸ§‘â€âš•ï¸ Patient lookup?", "ðŸ“‹ Generate report?"];

const BOT_RESPONSES: Record<string, string> = {
  "ðŸ“Š Case summary?": `ðŸ“Š Hospital Summary â€” Mar 2026:\n\nðŸ”´ Severe: 8 cases (5 currently hospitalized)\nðŸŸ  Moderate: 24 cases\nðŸŸ¡ Mild: 19 cases\nâœ… Recovered: 16 cases\n\nðŸ“ˆ Total active: 51\nMost common: Cholera (34%) Â· Typhoid (28%)\n\nâš ï¸ Peak day: Mar 7 â€” 18 admissions\n\nOccupancy alert: ICU at 78% capacity.`,
  "ðŸ—ºï¸ Risk zones?": `ðŸ—ºï¸ Outbreak Hotspots Near Gauhati Medical College:\n\n1. ðŸ”´ Kamrup East (781001) â€” HIGHEST\n   TDS: 842 ppm | pH: 5.2 | Cases: 18 total\n\n2. ðŸ”´ Azara (781017)\n   TDS: 710 ppm | Cases: 14 total\n\n3. ðŸŸ  Jalukbari (781013)\n   TDS: 520 ppm | Cases: 11 total\n\n4. ðŸŸ  Beltola (781028)\n   TDS: 620 ppm | Cases: 9 total\n\n5. ðŸŸ¢ Your Area: Dispur (781005)\n   TDS: 310 ppm | Cases: 4 (low risk)\n\nðŸ“¢ District RRT has been notified for 781001.`,
  "ðŸ¦  Cholera protocol?": `ðŸ’Š Cholera Clinical Protocol (WHO/ICMR):\n\n1. CONFIRM: Rice-water stools + rapid dehydration\n2. REHYDRATE: IV Ringer's Lactate â€” 100mL/kg in 3 hrs (severe)\n3. ORS: Continue oral â€” 200mL per stool\n4. ANTIBIOTIC: Doxycycline 300mg single dose (adults)\n   Azithromycin 1g for pregnant/children\n5. MONITOR: Vitals q1h for severe cases\n6. ISOLATE: Contact precautions, gloves\n7. REPORT: Submit via Sanjeevani within 24h\n8. TRACE: Identify water source\n\nðŸ“ž District Health Officer: 0361-2XX-XXXX`,
  "ðŸ§‘â€âš•ï¸ Patient lookup?": `ðŸ§‘â€âš•ï¸ Recent Patients â€” Last 7 Days:\n\nP-001 â€” Arun Kalita, 45M Â· Mar 8\n   Suspected Cholera Â· Under Treatment\n\nP-002 â€” Sunita Borah, 32F Â· Mar 7\n   Cholera (confirmed) Â· Hospitalized\n\nP-003 â€” Manish Gogoi, 67M Â· Mar 7\n   Typhoid Â· Hospitalized â€” watch BP\n\nP-008 â€” Rekha Baruah, 55F Â· Mar 3\n   Cholera Â· ICU â€” critical\n\nTo view full records, navigate to Patients section.`,
  "ðŸ“‹ Generate report?": `ðŸ“‹ Monthly Report â€” March 2026:\n\nâ”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\nGAUHATI MEDICAL COLLEGE\nDisease Surveillance Report Â· Q1 2026\n\nðŸ“Š SUMMARY\nâ€¢ Total Cases: 67\nâ€¢ Severe: 8 | Moderate: 24 | Mild: 19 | Recovered: 16\nâ€¢ Recovery Rate: 76%\nâ€¢ Avg Hospitalization Duration: 4.2 days\n\nðŸ¦  TOP DISEASES\n1. Cholera â€” 34%\n2. Typhoid â€” 28%\n3. Diarrhea â€” 24%\n\nðŸ“ HIGH RISK PINCODES\n781001 Â· 781017 Â· 781013\n\nReport submitted to District Health Officer âœ“\nâ”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\nDownload full PDF from Reports section.`,
  default: `I can assist with hospital-specific queries:\nâ€¢ Daily case summaries\nâ€¢ Outbreak risk zone updates\nâ€¢ Clinical protocols\nâ€¢ Patient information lookup\nâ€¢ Report generation\n\nWhat would you like to know?`,
};

const INITIAL_MESSAGES: Message[] = [
  { id: 1, side: "bot", text: "Hello! ðŸ‘‹ Here's your hospital summary:\n\nðŸ¥ Gauhati Medical College Â· 781005\nðŸ¦  Active Cases: 67\nðŸ”´ Severe: 8 Â· Hospitalized: 5\nðŸ“ Nearest High Risk Zone: 781001\n\nHow can I assist you today?" },
];

export default function HospChat() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  const GEMINI_API_KEY =
    import.meta.env.VITE_GEMINI_API_KEY;

  const send = async (text: string) => {
    if (!text.trim()) return;
    setMessages(m => [...m, { id: Date.now(), side: "user", text }]);
    setInput("");
    setIsTyping(true);

    if (!GEMINI_API_KEY) {
      setMessages(m => [...m, { id: Date.now() + 1, side: "bot", text: "Demo chat is not configured on this device." }]);
      setIsTyping(false);
      return;
    }

    try {
      const systemInstruction = "You are the Sanjeevani AI Assistant optimized for Hospital staff (Gauhati Medical College Â· 781005). Provide clinical protocols, disease summaries, hospital resource management advice, and outbreak tracking insights. Keep answers highly professional, medical-focused, and concise. Format with emojis where appropriate.";
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: text }] }]
        })
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
        <h2 className="font-display text-[24px] font-bold text-[#0D1F1A]">Sanjeevani AI Assistant</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-sm text-gray-600 font-medium">{GEMINI_API_KEY ? "Demo key configured" : "Demo chat unavailable"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chat */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col" style={{ height: 580 }}>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-start gap-3 ${msg.side === "user" ? "flex-row-reverse" : ""}`}>
                {msg.side === "bot" && (
                  <div className="w-8 h-8 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0 mt-0.5">
                    <Stethoscope className="w-4 h-4 text-[#1565C0]" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${msg.side === "bot" ? "bg-gray-50 text-gray-700 rounded-tl-none" : "bg-[#1565C0] text-white rounded-tr-none"}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center">
                  <Stethoscope className="w-4 h-4 text-[#1565C0]" />
                </div>
                <div className="bg-gray-50 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <motion.div key={i} className="w-2 h-2 rounded-full bg-[#1565C0]" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, delay, repeat: Infinity }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          {/* Quick replies */}
          <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-gray-50">
            {QUICK_REPLIES.map(qr => (
              <button key={qr} onClick={() => send(qr)} className="shrink-0 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-600 hover:border-[#1565C0] hover:text-[#1565C0] transition-colors bg-white">{qr}</button>
            ))}
          </div>
          {/* Input */}
          <div className="p-4 border-t border-gray-100 flex gap-3">
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send(input)}
              placeholder="Ask about cases, protocols, patients, or reportsâ€¦"
              className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20" />
            <button onClick={() => send(input)} className="w-10 h-10 rounded-full bg-[#1565C0] text-white flex items-center justify-center hover:bg-blue-900 transition-colors shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h4 className="font-display font-bold text-[#0D1F1A] mb-3 text-sm">Hospital Summary</h4>
            <div className="space-y-2.5">
              {[{ label: "Active Cases", value: "67", color: "#E53935" }, { label: "Severe Cases", value: "8", color: "#E53935" }, { label: "Total Patients", value: "1,284", color: "#1565C0" }, { label: "Recovery Rate", value: "76%", color: "#43A047" }].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">{s.label}</span>
                  <span className="font-mono font-bold text-sm" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h4 className="font-display font-bold text-[#0D1F1A] mb-3 text-sm">Clinical Protocols</h4>
            <div className="space-y-2">
              {[{ icon: "ðŸ¦ ", label: "Cholera Treatment â†’", color: "#E53935" }, { icon: "ðŸ¤’", label: "Typhoid Management â†’", color: "#FB8C00" }, { icon: "ðŸ’§", label: "Dehydration Protocol â†’", color: "#1565C0" }, { icon: "ðŸ¥", label: "Isolation Guidelines â†’", color: "#43A047" }].map(p => (
                <button key={p.label} onClick={() => send("ðŸ¦  Cholera protocol?")}
                  className="w-full flex items-center gap-2.5 py-2 px-3 rounded-xl text-left text-xs font-semibold hover:bg-gray-50 transition-colors border border-gray-100" style={{ color: p.color }}>
                  <span>{p.icon}</span>{p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h4 className="font-display font-bold text-[#0D1F1A] mb-3 text-sm">Emergency Contacts</h4>
            <div className="space-y-2.5">
              {[{ icon: "ðŸ›ï¸", label: "District Health Officer", number: "0361-2XX-XXXX" }, { icon: "ðŸ¥", label: "NHM Assam", number: "1800-XXX-XXXX" }, { icon: "ðŸš‘", label: "Ambulance", number: "108" }].map(c => (
                <div key={c.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><span>{c.icon}</span><span className="text-xs font-medium text-[#0D1F1A]">{c.label}</span></div>
                  <span className="text-xs font-mono text-[#1565C0] font-semibold">{c.number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
