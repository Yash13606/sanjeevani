import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Droplets, AlertTriangle, Activity } from "lucide-react";

type MessageSide = "bot" | "user";
interface Message {
  id: number;
  side: MessageSide;
  text: string;
  time: string;
}

const QUICK_REPLIES = [
  "ðŸ’§ Is water safe?",
  "ðŸ¦  Cholera symptoms?",
  "ðŸ¥ Nearest PHC?",
  "ðŸ›¡ï¸ Prevention tips",
  "ðŸ“Š My area risk?",
];

const BOT_RESPONSES: Record<string, string> = {
  "ðŸ’§ Is water safe?": `Based on current sensor data for pincode 781001:\n- TDS: 842 ppm (âš ï¸ Above safe limit of 500 ppm)\n- pH: 5.2 (âš ï¸ Acidic â€” safe range is 6.5â€“8.5)\n- Turbidity: 78 NTU (âš ï¸ High)\n\nðŸš« I recommend NOT drinking tap water directly.\nâœ… Please boil water for at least 10 minutes before use.\nâœ… Alternatively, use a certified water purifier.\n\nWould you like more about water purification methods?`,
  "ðŸ¦  Cholera symptoms?": `âš ï¸ Key cholera symptoms to watch for:\n\n1. Sudden profuse watery diarrhea\n2. Vomiting without nausea\n3. Rapid dehydration\n4. Muscle cramps\n5. Dry mouth and extreme thirst\n\nðŸš¨ If you experience these, contact your ASHA worker immediately or go to PHC Dispur.\n\nâœ… Oral rehydration salts (ORS) can help prevent fatal dehydration while seeking care.`,
  "ðŸ¥ Nearest PHC?": `ðŸ“ Nearest healthcare facilities:\n\n1. PHC Dispur â€” 2.1 km away\n   â˜Žï¸ 0361-2XX-XXXX | Open 24/7\n\n2. Community Health Centre Kamrup â€” 4.8 km\n   â˜Žï¸ 0361-2XX-XXXX | Mon-Sat 8amâ€“6pm\n\n3. Gauhati Medical College Hospital â€” 8.2 km\n   â˜Žï¸ 0361-2XX-XXXX | Emergency 24/7\n\nðŸ‘©â€âš•ï¸ Your assigned ASHA worker Priya Sharma is also reachable at 98540-XXXXX.`,
  "ðŸ›¡ï¸ Prevention tips": `âœ… Top 5 prevention tips for your area:\n\n1. ðŸ’§ Boil all drinking water for at least 10 minutes\n2. ðŸ§¼ Wash hands with soap â€” especially before meals\n3. ðŸ¥¦ Avoid raw vegetables until water situation improves\n4. ðŸš½ Ensure proper sanitation â€” no open defecation\n5. ðŸ“‹ Report symptoms early to your ASHA worker\n\nðŸŒŸ Clean water supply is available at PHC Dispur for emergency use.`,
  "ðŸ“Š My area risk?": `ðŸ“Š Current risk summary for Guwahati 781001:\n\nâš ï¸ Risk Level: MEDIUM\nðŸ¦  14 cases reported nearby this week\nðŸ’§ TDS: 842 ppm (Critical â€” 68% above safe limit)\nâš—ï¸ pH: 5.2 (Acidic â€” unsafe for drinking)\nðŸŒŠ Turbidity: 78 NTU (High)\n\nðŸ“… Alert issued: Mar 9, 2026 Â· Sanjeevani AI\n\nActions taken: PHC team alerted, ASHA workers notified, water quality advisory issued.`,
  default: `I understand your concern. Based on the current health data for your area (Guwahati, 781001), I'd recommend staying cautious about water consumption and following our alerts.\n\nYou can ask me about:\nâ€¢ Water safety status\nâ€¢ Disease symptoms\nâ€¢ Nearest healthcare facilities\nâ€¢ Prevention tips\nâ€¢ Your area risk level\n\nHow can I help you today?`,
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    side: "bot",
    text: `Hello Rahul! ðŸ‘‹ I'm your Sanjeevani health assistant.\n\nYour area (Guwahati, 781001) currently has âš ï¸ MEDIUM RISK.\n\nI can help you with health advice, alert information, and disease prevention. What would you like to know?`,
    time: "Now",
  },
  {
    id: 2,
    side: "user",
    text: "Is the water safe to drink in my area?",
    time: "Now",
  },
  {
    id: 3,
    side: "bot",
    text: `Based on current sensor data for pincode 781001:\n- TDS: 842 ppm (âš ï¸ Above safe limit of 500 ppm)\n- pH: 5.2 (âš ï¸ Acidic â€” safe range is 6.5â€“8.5)\n- Turbidity: 78 NTU (âš ï¸ High)\n\nðŸš« I recommend NOT drinking tap water directly.\nâœ… Please boil water for at least 10 minutes before use.\nâœ… Alternatively, use a certified water purifier.\n\nWould you like to know more about water purification?`,
    time: "Now",
  },
];

export default function ChatbotSection() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const GEMINI_API_KEY =
    import.meta.env.VITE_GEMINI_API_KEY;

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now(), side: "user", text, time: "Just now" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    if (!GEMINI_API_KEY) {
      setMessages((prev) => [...prev, { id: Date.now() + 1, side: "bot", text: "Demo chat is not configured on this device.", time: "Just now" }]);
      setIsTyping(false);
      return;
    }

    try {
      const systemInstruction = "You are the Sanjeevani AI Health Assistant for a citizen in Guwahati (pincode 781001). The current area risk is MEDIUM. Provide helpful, concise health advice, symptom checking, and water safety tips. Keep answers short and use emojis.";
      
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
        <h2 className="font-display text-[24px] font-bold text-[#0D1F1A]">Sanjeevani AI Health Assistant</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-sm text-gray-600 font-medium">{GEMINI_API_KEY ? "Demo key configured" : "Demo chat unavailable"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chat area (65%) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col" style={{ height: 580 }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-start gap-3 ${msg.side === "user" ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                {msg.side === "bot" && (
                  <div className="w-8 h-8 rounded-full bg-[#E8F5EE] border border-[#C8EBD8] flex items-center justify-center shrink-0 mt-0.5">
                    <Droplets className="w-4 h-4 text-[#0D7A4A]" />
                  </div>
                )}
                {/* Bubble */}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                  msg.side === "bot"
                    ? "bg-gray-50 text-gray-700 rounded-tl-none"
                    : "bg-[#0D7A4A] text-white rounded-tr-none"
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E8F5EE] border border-[#C8EBD8] flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-[#0D7A4A]" />
                </div>
                <div className="bg-gray-50 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-[#0D7A4A]"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, delay, repeat: Infinity }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-gray-50 no-scrollbar">
            {QUICK_REPLIES.map((qr) => (
              <button
                key={qr}
                onClick={() => sendMessage(qr)}
                className="shrink-0 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-600 hover:border-[#0D7A4A] hover:text-[#0D7A4A] transition-colors bg-white"
              >
                {qr}
              </button>
            ))}
          </div>

          {/* Input area */}
          <div className="p-4 border-t border-gray-100 flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              placeholder="Ask me anything about your health..."
              className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7A4A]/20 focus:border-[#0D7A4A]/40"
            />
            <button
              onClick={() => sendMessage(input)}
              className="w-10 h-10 rounded-full bg-[#0D7A4A] text-white flex items-center justify-center hover:bg-[#0D1F1A] transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info sidebar (35%) */}
        <div className="space-y-4">
          {/* Risk summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h4 className="font-display font-bold text-[#0D1F1A] mb-3 text-sm">Your Risk Summary</h4>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full border-4 border-[#FB8C00] flex items-center justify-center bg-[#FFF3E0]">
                <AlertTriangle className="w-5 h-5 text-[#FB8C00]" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-mono">781001</p>
                <p className="font-bold text-[#FB8C00] text-sm">MEDIUM RISK</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-gray-400">Updated 6 min ago</span>
            </div>
          </div>

          {/* Health tips */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h4 className="font-display font-bold text-[#0D1F1A] mb-3 text-sm">Quick Health Tips</h4>
            <ul className="space-y-2">
              {[
                "Boil water before drinking",
                "Wash hands with soap regularly",
                "Avoid open defecation areas",
                "Use ORS for diarrhea",
                "Report symptoms early",
              ].map((tip) => (
                <li key={tip} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="text-green-500 shrink-0">âœ…</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Emergency contacts */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h4 className="font-display font-bold text-[#0D1F1A] mb-3 text-sm">Emergency Contacts</h4>
            <div className="space-y-2.5">
              {[
                { icon: "ðŸ¥", label: "PHC Dispur", number: "0361-2XX-XXXX" },
                { icon: "ðŸ‘©â€âš•ï¸", label: "ASHA Priya", number: "98540-XXXXX" },
                { icon: "ðŸš‘", label: "District Hospital", number: "0361-2XX-XXXX" },
                { icon: "ðŸ†˜", label: "Health Helpline", number: "104" },
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
