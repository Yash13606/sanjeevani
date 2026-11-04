import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, UploadCloud, Bot, Send, Loader2, Sparkles } from "lucide-react";
import { PATIENTS_DATA, RISK_COLOR, RISK_BG, type RiskLevel } from "../hospitalData";

type Patient = typeof PATIENTS_DATA[number];
type GenderFilter = "All" | "M" | "F" | "Other";
type RiskFilter = "All" | RiskLevel;

const GEMINI_API_KEY =
  import.meta.env.VITE_GEMINI_API_KEY;

// â”€â”€â”€ Delete confirm modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DeleteModal({ patient, onClose, onConfirm }: { patient: Patient; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">ðŸ—‘ï¸</span>
        </div>
        <h3 className="font-display text-lg font-bold text-[#0D1F1A] mb-2">Remove Patient?</h3>
        <p className="text-sm text-gray-500 mb-6">Are you sure you want to remove <strong>{patient.name}</strong>? This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-[#E53935] text-white text-sm font-semibold hover:bg-red-700 transition-colors">Delete</button>
        </div>
      </motion.div>
    </div>
  );
}

// â”€â”€â”€ Add / Edit Patient Slide-over with CSV + AI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PatientSlideOver({ patient, onClose, onSave }: { patient?: Patient; onClose: () => void; onSave: (p: Partial<Patient>) => void }) {
  const [saved, setSaved] = useState(false);
  
  // Controlled form state
  const [formData, setFormData] = useState({
    name: patient?.name || "",
    age: patient?.age?.toString() || "",
    gender: patient?.gender || "M",
    phone: patient?.phone || "",
    email: patient?.email || "",
    address: patient?.address || "",
    pincode: patient?.pincode || "",
    history: patient?.history || ""
  });

  // CSV + AI state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [aiMessages, setAiMessages] = useState<{role: "user"|"bot", text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  const handleSave = (e: React.FormEvent) => { e.preventDefault(); setSaved(true); };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setCsvContent(text);
        setAiMessages([
          { role: "bot", text: `Loaded CSV: **${file.name}**\n\nI can automatically extract patient details to fill the form below, or you can ask me questions about this data.` }
        ]);
      };
      reader.readAsText(file);
    }
  };

  const autofillFromCSV = async () => {
    if (!csvContent) return;
    setIsAiLoading(true);
    setAiMessages(p => [...p, { role: "user", text: "Please extract patient details and autofill the form." }]);
    if (!GEMINI_API_KEY) {
      setAiMessages(p => [...p, { role: "bot", text: "AI CSV assistance is not configured on this device." }]);
      setIsAiLoading(false);
      return;
    }
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: "You are a medical data extraction assistant. Extract patient details from the provided CSV data. Return ONLY a valid JSON object with EXACTLY these keys: name (string), age (string), gender (must be exactly 'M' or 'F' or 'Other'), phone (string), email (string), address (string), pincode (string), history (string). Ensure the output is valid JSON without any markdown code blocks or additional text. If a field is missing, return an empty string for it." }] },
          contents: [{ parts: [{ text: `CSV Data:\n${csvContent}` }] }]
        })
      });
      const data = await res.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      // Strip markdown json formatting if Gemini includes it despite instructions
      text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(text);
      
      setFormData(prev => ({
        ...prev,
        name: parsed.name || prev.name,
        age: parsed.age?.toString() || prev.age,
        gender: parsed.gender || prev.gender,
        phone: parsed.phone || prev.phone,
        email: parsed.email || prev.email,
        address: parsed.address || prev.address,
        pincode: parsed.pincode || prev.pincode,
        history: parsed.history || prev.history,
      }));
      setAiMessages(p => [...p, { role: "bot", text: "âœ… I've successfully extracted the details and populated the form below! Please review the fields before saving." }]);
    } catch (err) {
      console.error(err);
      setAiMessages(p => [...p, { role: "bot", text: "âŒ Sorry, I encountered an error while trying to extract the data. Please ensure the CSV contains recognizable patient information." }]);
    }
    setIsAiLoading(false);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userText = chatInput;
    setAiMessages(p => [...p, { role: "user", text: userText }]);
    setChatInput("");
    setIsAiLoading(true);
    if (!GEMINI_API_KEY) {
      setAiMessages(p => [...p, { role: "bot", text: "AI CSV assistance is not configured on this device." }]);
      setIsAiLoading(false);
      return;
    }
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: "You are a helpful assistant assisting a hospital worker. The user has uploaded a patient CSV file. Answer their questions clearly and concisely based on the CSV data." }] },
          contents: [{ parts: [{ text: `CSV Data:\n${csvContent}\n\nUser Question:\n${userText}` }] }]
        })
      });
      const data = await res.json();
      const botText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that.";
      setAiMessages(p => [...p, { role: "bot", text: botText }]);
    } catch (err) {
      setAiMessages(p => [...p, { role: "bot", text: "Error connecting to Sanjeevani AI." }]);
    }
    setIsAiLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div initial={{ x: 500 }} animate={{ x: 0 }} exit={{ x: 500 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative w-full max-w-[480px] bg-white shadow-2xl flex flex-col overflow-hidden text-sm">
        
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-[#F4F6F5]">
          <div>
            <h2 className="font-display text-xl font-bold text-[#0D1F1A]">{patient ? "Edit Patient" : "Add New Patient"}</h2>
            {!patient && <p className="text-xs text-gray-500 mt-0.5">Upload records or enter manually</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500"><X className="w-5 h-5" /></button>
        </div>

        {saved ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4"><CheckCircle className="w-9 h-9 text-[#43A047]" /></div>
            <h3 className="font-display text-xl font-bold text-[#0D1F1A] mb-1">Patient {patient ? "Updated" : "Added"}!</h3>
            <p className="text-sm text-gray-500 mb-6">
              {patient ? `${formData.name}'s record has been updated.` : "New patient record has been saved successfully."}
            </p>
            <button onClick={onClose} className="px-8 py-2.5 rounded-xl bg-[#1565C0] text-white text-sm font-semibold hover:bg-blue-900 transition-colors">Done</button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* AI / CSV Upload Section (Only for new patients) */}
            {!patient && (
              <div className="bg-[#EFF6FF] border-b border-blue-100 p-5 shrink-0">
                {!csvContent ? (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#1565C0]/30 bg-white/50 rounded-xl p-5 cursor-pointer hover:bg-white transition-colors group">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-5 h-5 text-[#1565C0]" />
                    </div>
                    <p className="font-semibold text-[#1565C0] text-sm">Upload Patient CSV</p>
                    <p className="text-[11px] text-[#1565C0]/70 mt-1">Sanjeevani AI will auto-extract details</p>
                    <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                  </label>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-blue-100 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b flex items-center justify-between bg-blue-50/50">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-[#1565C0]" />
                        <span className="font-semibold text-[#1565C0] text-sm">Sanjeevani AI Analysis</span>
                      </div>
                      <button onClick={autofillFromCSV} disabled={isAiLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1565C0] hover:bg-blue-900 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-70">
                        {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Sparkles className="w-3.5 h-3.5" />} Autofill Form
                      </button>
                    </div>
                    
                    {/* Chat Area */}
                    <div className="h-44 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                      {aiMessages.map((msg, i) => (
                        <div key={i} className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                          {msg.role === "bot" && (
                            <div className="w-6 h-6 rounded-full bg-[#1565C0] flex items-center justify-center shrink-0 mt-0.5"><Bot className="w-3.5 h-3.5 text-white" /></div>
                          )}
                          <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-line ${msg.role === "bot" ? "bg-white border border-gray-200 text-gray-700 rounded-tl-none" : "bg-[#1565C0] text-white rounded-tr-none"}`}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                      {isAiLoading && <div className="flex gap-2"><div className="w-6 h-6 rounded-full bg-[#1565C0] flex items-center flex-shrink-0 justify-center"><Bot className="w-3.5 h-3.5 text-white" /></div><div className="px-3 py-2 rounded-xl bg-white border text-xs text-gray-400">Thinking...</div></div>}
                      <div ref={chatEndRef} />
                    </div>

                    <div className="p-2 border-t flex gap-2 bg-white">
                      <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSendChat()}
                        placeholder="Ask AI about this CSV..." className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#1565C0]" />
                      <button onClick={handleSendChat} disabled={isAiLoading} className="w-8 h-8 rounded-lg bg-[#1565C0] hover:bg-blue-900 text-white flex items-center justify-center shrink-0 disabled:opacity-50">
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSave} className="p-6 space-y-4 shrink-0">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Full Name</label>
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="e.g. Priya Sharma" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Age</label>
                  <input type="number" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} required className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="e.g. 34" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">Gender</label>
                  <div className="flex gap-2">
                    {[{ v: "M", l: "M" }, { v: "F", l: "F" }, { v: "Other", l: "O" }].map(g => (
                      <label key={g.v} className={`flex-1 py-1.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all flex items-center justify-center ${formData.gender === g.v ? "border-[#1565C0] bg-[#EFF6FF] text-[#1565C0]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                        <input type="radio" name="gender" value={g.v} checked={formData.gender === g.v} onChange={e => setFormData({...formData, gender: e.target.value})} className="sr-only" />{g.l}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Contact Phone</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="e.g. 98540-11111" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email (optional)</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="patient@email.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Address</label>
                <textarea rows={2} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Full address..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Pincode</label>
                  <input maxLength={6} value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="e.g. 781001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">District (auto)</label>
                  <input disabled value="Kamrup" className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm text-gray-400 bg-gray-50 cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Medical History</label>
                <textarea rows={3} value={formData.history} onChange={e => setFormData({...formData, history: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Existing conditions, allergies, medications..." />
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl text-white text-sm font-semibold shadow-lg hover:shadow-xl hover:-translate-y-px transition-all" style={{ background: "#1565C0" }}>
                  {patient ? "Update Patient" : "Save Patient"}
                </button>
              </div>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// â”€â”€â”€ Patient Detail Slide-over â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PatientDetail({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const [tab, setTab] = useState<"overview" | "visits" | "cases">("overview");
  const VISITS = [
    { date: "Mar 8, 2026", type: "Follow-up visit", doctor: "Dr. R. Sharma", diagnosis: "Cholera (suspected)", treatment: "ORS + Antibiotics", status: "Under treatment" },
    { date: "Mar 1, 2026", type: "Initial consultation", doctor: "Dr. A. Nath", diagnosis: "Diarrhea, fever", treatment: "ORS prescribed", status: "Discharged" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div initial={{ x: 540 }} animate={{ x: 0 }} exit={{ x: 540 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative w-full max-w-[520px] bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b bg-[#EFF6FF] flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-[#0D1F1A]">{patient.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{patient.gender}, {patient.age} Â· {patient.address}</p>
            <span className="inline-block mt-2 text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: RISK_BG[patient.risk], color: RISK_COLOR[patient.risk] }}>
              {patient.risk} Risk Zone
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b shrink-0">
          {(["overview", "visits", "cases"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 capitalize py-3 text-xs font-semibold border-b-2 transition-all ${tab === t ? "border-[#1565C0] text-[#1565C0]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t === "visits" ? "Visit History" : t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview */}
          {tab === "overview" && (
            <div className="space-y-4">
              {[
                { l: "Patient ID", v: patient.id },
                { l: "Phone", v: patient.phone },
                { l: "Email", v: patient.email || "â€”" },
                { l: "Address", v: `${patient.address}, Guwahati` },
                { l: "Pincode", v: patient.pincode },
                { l: "Last Visit", v: patient.lastVisit },
              ].map(r => (
                <div key={r.l} className="flex items-start gap-3 py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-400 w-28 shrink-0">{r.l}</span>
                  <span className="text-sm font-medium text-[#0D1F1A]">{r.v}</span>
                </div>
              ))}
              <div>
                <p className="text-xs text-gray-400 mb-2">Medical History</p>
                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 leading-relaxed">{patient.history || "No known history."}</div>
              </div>
            </div>
          )}

          {/* Visit History */}
          {tab === "visits" && (
            <div className="space-y-4 relative pl-4">
              <div className="absolute left-[7px] top-2 bottom-8 w-px bg-gray-200" />
              {VISITS.map((v, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-4 top-1.5 w-3 h-3 rounded-full bg-[#1565C0] border-2 border-white shadow-sm z-10" />
                  <div className="bg-gray-50 rounded-xl p-4 ml-2">
                    <p className="text-xs text-gray-400 mb-1">{v.date} Â· {v.type}</p>
                    <p className="text-xs font-semibold text-[#0D1F1A] mb-2">{v.doctor}</p>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p>Diagnosis: <span className="font-medium">{v.diagnosis}</span></p>
                      <p>Treatment: <span className="font-medium">{v.treatment}</span></p>
                      <p>Status: <span className="font-medium">{v.status}</span></p>
                    </div>
                  </div>
                </div>
              ))}
              <button className="ml-2 w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-xs font-semibold text-gray-500 hover:border-[#1565C0] hover:text-[#1565C0] transition-colors">+ Add New Visit</button>
            </div>
          )}

          {/* Linked Cases */}
          {tab === "cases" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-[#0D1F1A]">CASE-067</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF3E0] text-[#FB8C00]">ðŸŸ  MODERATE</span>
                </div>
                <p className="text-xs text-gray-500">Suspected Cholera Â· Under Treatment Â· Mar 8</p>
              </div>
              <button className="w-full py-2.5 rounded-xl bg-[#E53935] text-white text-xs font-semibold hover:bg-red-700 transition-colors">Report New Case for Patient</button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// â”€â”€â”€ Patients Section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function HospPatients() {
  const [gFilter, setGFilter] = useState<GenderFilter>("All");
  const [rFilter, setRFilter] = useState<RiskFilter>("All");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [deletePatient, setDeletePatient] = useState<Patient | null>(null);
  const [viewPatient, setViewPatient] = useState<Patient | null>(null);
  const [patients, setPatients] = useState(PATIENTS_DATA);

  const filtered = patients.filter(p => {
    const s = search.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(s) || p.phone.includes(s) || p.pincode.includes(s);
    const matchGender = gFilter === "All" || p.gender === gFilter;
    const matchRisk = rFilter === "All" || p.risk === rFilter;
    return matchSearch && matchGender && matchRisk;
  });

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[28px] font-bold text-[#0D1F1A]">Patient Records</h2>
          <div className="flex items-center gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, pincodeâ€¦"
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 min-w-60" />
            <button onClick={() => setShowAdd(true)} className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity shrink-0" style={{ background: "#0D7A4A" }}>+ Add Patient</button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {(["All", "M", "F", "Other"] as GenderFilter[]).map(g => (
              <button key={g} onClick={() => setGFilter(g)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${gFilter === g ? "bg-white text-[#0D1F1A] shadow-sm" : "text-gray-500"}`}>{g === "M" ? "Male" : g === "F" ? "Female" : g}</button>
            ))}
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {(["All", "HIGH", "MEDIUM", "LOW"] as RiskFilter[]).map(r => (
              <button key={r} onClick={() => setRFilter(r)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${rFilter === r ? "bg-white text-[#0D1F1A] shadow-sm" : "text-gray-500"}`}>{r === "HIGH" ? "ðŸ”´ High" : r === "MEDIUM" ? "ðŸŸ  Med" : r === "LOW" ? "ðŸŸ¢ Low" : "All"}</button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-xs">
          {[{ label: "Total", value: "1,284", color: "#0D1F1A" }, { label: "Male", value: "698", color: "#1565C0" }, { label: "Female", value: "572", color: "#C2185B" }, { label: "Other", value: "14", color: "#FB8C00" }].map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
               <span className="font-mono font-bold text-base" style={{ color: s.color }}>{s.value}</span>
              <span className="text-gray-400">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[11px] text-gray-500 uppercase tracking-wider">
                  {["Patient", "Age/Gender", "Contact", "Address", "Last Visit", "Risk Zone", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#1565C0] flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {p.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-[#0D1F1A]">{p.name}</p>
                          <p className="text-[10px] font-mono text-gray-400">{p.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{p.age} Â· {p.gender === "M" ? "Male" : p.gender === "F" ? "Female" : "Other"}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-mono">{p.phone}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{p.address}, {p.pincode}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{p.lastVisit}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ color: RISK_COLOR[p.risk], background: RISK_BG[p.risk] }}>
                        {p.risk === "HIGH" ? "ðŸ”´" : p.risk === "MEDIUM" ? "ðŸŸ " : "ðŸŸ¢"} {p.risk}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setViewPatient(p)} className="text-xs font-semibold text-[#1565C0] hover:text-blue-900 transition-colors">View</button>
                        <span className="text-gray-200">|</span>
                        <button onClick={() => setEditPatient(p)} className="text-xs font-semibold text-[#FB8C00] hover:text-orange-700 transition-colors">Edit</button>
                        <span className="text-gray-200">|</span>
                        <button onClick={() => setDeletePatient(p)} className="text-xs font-semibold text-[#E53935] hover:text-red-700 transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Showing 1â€“{Math.min(filtered.length, 12)} of 1,284 patients</span>
            <div className="flex items-center gap-1">
              <button className="px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50">â† Prev</button>
              {[1, 2, 3].map(n => <button key={n} className={`w-7 h-7 rounded-lg text-xs font-semibold ${n === 1 ? "bg-[#0D1F1A] text-white" : "hover:bg-gray-50 border border-gray-200"}`}>{n}</button>)}
              <span>...</span>
              <button className="px-2.5 py-1 rounded-lg border border-gray-200 font-mono">107</button>
              <button className="px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50">Next â†’</button>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showAdd && <PatientSlideOver onClose={() => setShowAdd(false)} onSave={() => setShowAdd(false)} />}
        {editPatient && <PatientSlideOver patient={editPatient} onClose={() => setEditPatient(null)} onSave={() => setEditPatient(null)} />}
        {deletePatient && <DeleteModal patient={deletePatient} onClose={() => setDeletePatient(null)} onConfirm={() => { setPatients(ps => ps.filter(p => p.id !== deletePatient.id)); setDeletePatient(null); }} />}
        {viewPatient && <PatientDetail patient={viewPatient} onClose={() => setViewPatient(null)} />}
      </AnimatePresence>
    </>
  );
}
