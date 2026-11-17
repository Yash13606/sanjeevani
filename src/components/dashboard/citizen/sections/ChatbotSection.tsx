import { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Send, Droplets, AlertTriangle } from "lucide-react";
import { useMl } from "@/lib/ml/MlContext";
import { areaReply, buildChatContext, contextAsPrompt, waterReply, SYNTHETIC_NOTE, type ChatContext } from "@/lib/ml/chatContext";
import { TASK_META, TIER_META, formatWeek, unitName, unitTier } from "@/lib/ml/risk";

type MessageSide = "bot" | "user";
interface Message {
  id: number;
  side: MessageSide;
  text: string;
  time: string;
}

const QUICK_REPLIES = [
  "💧 Is water safe?",
  "🦠 Cholera symptoms?",
  "🏥 Where to get care?",
  "🛡️ Prevention tips",
  "📊 My area risk?",
];

// General health information that does not depend on the model
const STATIC_REPLIES: Record<string, string> = {
  "🦠 Cholera symptoms?": `⚠️ Key cholera symptoms to watch for:\n\n1. Sudden profuse watery diarrhea\n2. Vomiting\n3. Rapid dehydration\n4. Muscle cramps\n5. Dry mouth and extreme thirst\n\n🚨 If you have these, contact your ASHA worker or go to the nearest health facility straight away.\n\n✅ Oral rehydration salts (ORS) can help prevent dangerous dehydration while you get care.\n\nThe model in this experiment looks at cholera and acute diarrheal disease only.`,
  "🏥 Where to get care?": `🏥 This demo does not know real facility locations.\n\nIn a real setting you would:\n1. Tell your ASHA worker (the Reports tab lets you send a report)\n2. Visit your nearest Primary Health Centre\n3. Go to the district hospital for severe dehydration or blood in stool\n\n📞 State health helpline: 104`,
  "🛡️ Prevention tips": `✅ Top prevention tips:\n\n1. 💧 Boil drinking water for at least 10 minutes, or use a certified purifier\n2. 🧼 Wash hands with soap, especially before meals and after the toilet\n3. 🥦 Avoid raw foods washed in untreated water\n4. 🚽 Keep latrines and drains clean and away from water sources\n5. 📋 Report symptoms early to your ASHA worker`,
};

function replyFor(text: string, ctx: ChatContext | null): string {
  if (text === "💧 Is water safe?") return waterReply(ctx);
  if (text === "📊 My area risk?") return areaReply(ctx);
  if (STATIC_REPLIES[text]) return STATIC_REPLIES[text];
  return `I can answer about water inputs, your area's model tier, symptoms and prevention.\n\nTry one of the quick questions below.\n\n${SYNTHETIC_NOTE}`;
}

export default function ChatbotSection() {
  const { board, units, homeUnit, date } = useMl();
  const ctx = useMemo(() => buildChatContext(board, units, homeUnit), [board, units, homeUnit]);
  const home = board?.units.find((u) => u.unit_id === homeUnit);
  const headlineTask = home?.m1 ? "m1" : "m2";
  const tier = unitTier(home, headlineTask);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      side: "bot",
      text: "Hello Rahul! 👋 I'm your Sanjeevani health assistant.\n\nI can read the saved synthetic model results for your area and share general prevention advice. Try a quick question below.\n\nℹ️ All risk numbers here come from a simulated experiment, not from real surveillance.",
      time: "Now",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now(), side: "user", text, time: "Just now" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Quick questions are answered from the saved model data without calling any external service.
    const isQuick = QUICK_REPLIES.includes(text);
    if (isQuick || !GEMINI_API_KEY) {
      const reply = isQuick
        ? replyFor(text, ctx)
        : `The optional demo chat is not configured on this device, so I can only answer the quick questions.\n\n${SYNTHETIC_NOTE}`;
      setMessages((prev) => [...prev, { id: Date.now() + 1, side: "bot", text: reply, time: "Just now" }]);
      return;
    }

    setIsTyping(true);
    try {
      const systemInstruction = contextAsPrompt("citizen", ctx);
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
      setMessages((prev) => [...prev, { id: Date.now() + 1, side: "bot", text: responseText, time: "Just now" }]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [...prev, { id: Date.now() + 1, side: "bot", text: "I'm having trouble connecting right now. Please try again.", time: "Just now" }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="mb-5">
        <h2 className="font-display text-[24px] font-bold text-[#0D1F1A]">Sanjeevani Health Assistant</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-sm text-gray-600 font-medium">
            {GEMINI_API_KEY ? "Demo key configured (open questions go to an external AI service)" : "Quick questions only (no demo key configured)"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chat area */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col" style={{ height: 580 }}>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-start gap-3 ${msg.side === "user" ? "flex-row-reverse" : ""}`}>
                {msg.side === "bot" && (
                  <div className="w-8 h-8 rounded-full bg-[#E8F5EE] border border-[#C8EBD8] flex items-center justify-center shrink-0 mt-0.5">
                    <Droplets className="w-4 h-4 text-[#0D7A4A]" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                  msg.side === "bot" ? "bg-gray-50 text-gray-700 rounded-tl-none" : "bg-[#0D7A4A] text-white rounded-tr-none"
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E8F5EE] border border-[#C8EBD8] flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-[#0D7A4A]" />
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
            {QUICK_REPLIES.map((qr) => (
              <button key={qr} onClick={() => sendMessage(qr)}
                className="shrink-0 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-600 hover:border-[#0D7A4A] hover:text-[#0D7A4A] transition-colors bg-white">
                {qr}
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-gray-100 flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              placeholder="Ask about water, symptoms or prevention..."
              className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7A4A]/20 focus:border-[#0D7A4A]/40"
            />
            <button onClick={() => sendMessage(input)} className="w-10 h-10 rounded-full bg-[#0D7A4A] text-white flex items-center justify-center hover:bg-[#0D1F1A] transition-colors shrink-0" aria-label="Send">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h4 className="font-display font-bold text-[#0D1F1A] mb-3 text-sm">Your Area Summary</h4>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full border-4 flex items-center justify-center"
                style={{ borderColor: TIER_META[tier ?? "routine"].color, background: TIER_META[tier ?? "routine"].bg }}>
                <AlertTriangle className="w-5 h-5" style={{ color: TIER_META[tier ?? "routine"].color }} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-mono">{homeUnit}</p>
                <p className="font-bold text-sm" style={{ color: TIER_META[tier ?? "routine"].color }}>
                  {tier ? TIER_META[tier].label.toUpperCase() : "NOT SCORED"} · {TASK_META[headlineTask].short}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">{unitName(units, homeUnit)}</p>
            <p className="text-xs text-gray-400 mt-1">Saved model week of {formatWeek(date)}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h4 className="font-display font-bold text-[#0D1F1A] mb-3 text-sm">Quick Health Tips</h4>
            <ul className="space-y-2">
              {["Boil water before drinking", "Wash hands with soap regularly", "Keep drains and latrines clean", "Use ORS for diarrhea", "Report symptoms early"].map((tip) => (
                <li key={tip} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="text-green-500 shrink-0">✅</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h4 className="font-display font-bold text-[#0D1F1A] mb-3 text-sm">Contacts (demo placeholders)</h4>
            <div className="space-y-2.5">
              {[
                { icon: "🏥", label: "Primary Health Centre", number: "044-XXXX-XXXX" },
                { icon: "👩‍⚕️", label: "ASHA Priya", number: "98540-XXXXX" },
                { icon: "🚑", label: "District Hospital", number: "044-XXXX-XXXX" },
                { icon: "🆘", label: "Health Helpline", number: "104" },
              ].map((c) => (
                <div key={c.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{c.icon}</span>
                    <span className="text-xs font-medium text-[#0D1F1A]">{c.label}</span>
                  </div>
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
