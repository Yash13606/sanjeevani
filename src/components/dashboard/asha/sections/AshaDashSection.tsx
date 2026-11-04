import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, X, CheckCircle, Send, Bell } from "lucide-react";
import { DASH_STATS, ACTIVITY_FEED, MAP_MARKERS, RISK_COLOR, RISK_BG, type RiskLevel } from "../ashaData";

// ─── MAP (same SVG approach as citizen) ──────────────────────────────────────
const MAP_BOUNDS = { minLat: 26.0, maxLat: 27.8, minLng: 91.5, maxLng: 95.2 };
function toXY(lat: number, lng: number, w: number, h: number) {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * w;
  const y = h - ((lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * h;
  return { x, y };
}

// ─── Post Survey Modal ────────────────────────────────────────────────────────
function PostSurveyModal({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-display text-xl font-bold text-[#0D1F1A]">📋 Post New Survey</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-[#43A047]" />
            </div>
            <h3 className="font-display text-xl font-bold text-[#0D1F1A] mb-1">Survey Published!</h3>
            <p className="text-sm text-gray-500 mb-6">Citizens in 781001 will receive a notification.</p>
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-[#0D7A4A] text-white text-sm font-semibold">Close</button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Survey Title</label>
              <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7A4A]/20" placeholder="e.g. April Water Quality Survey" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Description</label>
              <textarea rows={2} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7A4A]/20 resize-none" placeholder="Brief description..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Target Pincode</label>
                <input defaultValue="781001" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Max Responses</label>
                <input type="number" defaultValue="100" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Start Date</label>
                <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">End Date</label>
                <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-[#0D7A4A] text-white text-sm font-semibold hover:bg-[#0D1F1A] transition-colors">Publish Survey</button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// ─── Report Case Modal ────────────────────────────────────────────────────────
function ReportCaseModal({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState("moderate");
  const symptomList = ["Diarrhea", "Vomiting", "Fever", "Weakness", "Jaundice", "Dehydration", "Abdominal pain", "Skin rash"];

  const toggleSymptom = (s: string) => setSymptoms(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="font-display text-xl font-bold text-[#0D1F1A]">🦠 Report New Case</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-[#43A047]" />
            </div>
            <h3 className="font-display text-xl font-bold text-[#0D1F1A] mb-1">Case Reported!</h3>
            <p className="text-sm text-gray-500 mb-1">Reference: <span className="font-mono font-bold">PAT-011</span></p>
            <p className="text-sm text-gray-500 mb-6">System will auto-alert relevant authorities.</p>
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-[#E53935] text-white text-sm font-semibold">Close</button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Patient Name (Optional)</label>
                <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" placeholder="Leave blank for privacy" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Age</label>
                <input type="number" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" placeholder="e.g. 32" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Gender</label>
              <div className="flex gap-2">
                {["Male", "Female", "Other"].map(g => (
                  <button key={g} type="button" className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-[#0D1F1A] hover:bg-gray-50 transition-all">{g}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Symptoms</label>
              <div className="grid grid-cols-2 gap-2">
                {symptomList.map(s => (
                  <label key={s} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-xs font-medium transition-all ${symptoms.includes(s) ? "border-[#0D7A4A] bg-[#F0FAF7] text-[#0D7A4A]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                    <input type="checkbox" className="hidden" checked={symptoms.includes(s)} onChange={() => toggleSymptom(s)} />
                    <span>{symptoms.includes(s) ? "☑" : "☐"}</span> {s}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Suspected Disease</label>
              <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none">
                <option>Cholera</option><option>Typhoid</option><option>Diarrhea</option><option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Severity</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: "mild", label: "🟡 Mild", color: "#FDD835", bg: "#FFFDE7" }, { id: "moderate", label: "🟠 Moderate", color: "#FB8C00", bg: "#FFF3E0" }, { id: "severe", label: "🔴 Severe", color: "#E53935", bg: "#FFEBEE" }].map(s => (
                  <button key={s.id} type="button" onClick={() => setSeverity(s.id)}
                    className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all`}
                    style={severity === s.id ? { borderColor: s.color, background: s.bg, color: s.color } : { borderColor: "#E5E7EB", color: "#6B7280" }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Location Pincode</label>
              <input defaultValue="781001" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Notes</label>
              <textarea rows={2} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none resize-none" placeholder="Additional clinical notes..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Reported By</label>
              <input disabled value="Priya Sharma (ASHA Worker)" className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm text-gray-400 bg-gray-50 cursor-not-allowed" />
            </div>
            <button type="submit" className="w-full py-3 rounded-xl bg-[#E53935] text-white text-sm font-semibold hover:bg-red-700 transition-colors">Submit Case Report</button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// ─── Send Alert Modal ─────────────────────────────────────────────────────────
function SendAlertModal({ onClose }: { onClose: () => void }) {
  const [sent, setSent] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-display text-xl font-bold text-[#0D1F1A]">📢 Send Community Alert</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        {sent ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-[#43A047]" />
            </div>
            <h3 className="font-display text-xl font-bold text-[#0D1F1A] mb-1">Alert Sent!</h3>
            <p className="text-sm text-gray-500 mb-6">248 citizens in 781001 will receive this alert via SMS & WhatsApp.</p>
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-[#FB8C00] text-white text-sm font-semibold">Close</button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Target Pincode</label>
              <input defaultValue="781001" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Alert Message</label>
              <textarea rows={4} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none resize-none" 
                placeholder="e.g. HEALTH ALERT (781001): High TDS detected in water supply. Boil all drinking water. Stay safe — Sanjeevani ASHA Team" />
              <p className="text-[10px] text-gray-400 mt-1">Keep under 160 characters for SMS delivery.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Send Via</label>
              <div className="flex gap-2 flex-wrap">
                {[{ label: "SMS", color: "#0D7A4A" }, { label: "WhatsApp", color: "#25D366" }, { label: "In-App", color: "#1565C0" }].map(ch => (
                  <label key={ch.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-semibold cursor-pointer hover:border-gray-300">
                    <input type="checkbox" defaultChecked className="w-3 h-3" /> {ch.label}
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="w-full py-3 rounded-xl bg-[#FB8C00] text-white text-sm font-semibold hover:bg-orange-700 transition-colors flex items-center justify-center gap-2">
              <Send className="w-4 h-4" /> Send Alert Now
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// ─── Dashboard Section ────────────────────────────────────────────────────────
export default function AshaDashboard() {
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [activeMarker, setActiveMarker] = useState<string | null>(null);

  const W = 640, H = 330;

  return (
    <>
      <div className="space-y-6">
        {/* 1 — Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Active Cases */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Active Cases in Area</p>
            <div className="flex items-end gap-3 mb-2">
              <span className="font-display text-5xl font-bold" style={{ color: "#E53935" }}>23</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#FFEBEE] text-[#E53935] mb-1.5">↑ +4 this week</span>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>23 / 50 capacity</span><span>46%</span></div>
              <div className="h-2 rounded-full bg-gray-100"><div className="h-full rounded-full bg-[#E53935]" style={{ width: "46%" }} /></div>
            </div>
          </motion.div>

          {/* Pending Surveys */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Survey Responses Pending</p>
            <div className="flex items-end gap-3 mb-2">
              <span className="font-display text-5xl font-bold" style={{ color: "#FB8C00" }}>8</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#FFF3E0] text-[#FB8C00] mb-1.5">↓ 3 closing soon</span>
            </div>
            <p className="text-xs text-gray-400 mt-3">2 surveys close before Mar 15</p>
          </motion.div>

          {/* Alerts Today */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">New Alerts in Coverage Area</p>
            <div className="flex items-end gap-3 mb-2">
              <span className="font-display text-5xl font-bold text-[#1A6B4A]">5</span>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs font-semibold text-[#E53935] flex items-center gap-1"><span>🔴</span>2 High</span>
              <span className="text-xs font-semibold text-[#FB8C00] flex items-center gap-1"><span>🟠</span>2 Medium</span>
              <span className="text-xs font-semibold text-[#43A047] flex items-center gap-1"><span>🟢</span>1 Low</span>
            </div>
          </motion.div>
        </div>

        {/* 2 — Two column: Map + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-11 gap-5">
          {/* Coverage Area Risk Map (55%) */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="lg:col-span-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Your Coverage Area</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">Guwahati · Pincode 781001</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-600 font-semibold">Live</span>
              </div>
            </div>
            <div style={{ background: "linear-gradient(180deg, #EBF5F0 0%, #D6EEE5 100%)" }}>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 320 }}>
                {/* Grid */}
                {Array.from({ length: 7 }).map((_, i) => <line key={`v${i}`} x1={i * (W / 6)} y1={0} x2={i * (W / 6)} y2={H} stroke="#C8E6D4" strokeWidth="0.5" />)}
                {Array.from({ length: 5 }).map((_, i) => <line key={`h${i}`} x1={0} y1={i * (H / 4)} x2={W} y2={i * (H / 4)} stroke="#C8E6D4" strokeWidth="0.5" />)}

                {MAP_MARKERS.map((m) => {
                  const { x, y } = toXY(m.lat, m.lng, W, H);
                  const isActive = activeMarker === m.pincode;
                  const color = RISK_COLOR[m.risk];
                  const isYours = "isYours" in m && m.isYours;
                  return (
                    <g key={m.pincode} onClick={() => setActiveMarker(isActive ? null : m.pincode)} style={{ cursor: "pointer" }}>
                      {/* Outer pulse for your area */}
                      {isYours && (
                        <circle cx={x} cy={y} r={m.radius * 1.8} fill="#22C55E" opacity="0.08">
                          <animate attributeName="r" values={`${m.radius * 1.4};${m.radius * 2.2};${m.radius * 1.4}`} dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.15;0;0.15" dur="2s" repeatCount="indefinite" />
                        </circle>
                      )}
                      {/* High risk pulse */}
                      {m.risk === "HIGH" && !isYours && (
                        <circle cx={x} cy={y} r={m.radius * 1.4} fill={color} opacity="0.08">
                          <animate attributeName="r" values={`${m.radius};${m.radius * 1.8};${m.radius}`} dur="2.5s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.12;0;0.12" dur="2.5s" repeatCount="indefinite" />
                        </circle>
                      )}
                      <circle cx={x} cy={y} r={isActive ? m.radius + 4 : m.radius} fill={isYours ? "#22C55E" : color}
                        opacity={isActive ? 0.9 : 0.7} stroke="white" strokeWidth={isYours ? 3 : 2} style={{ transition: "all 0.2s" }} />
                      {isYours && <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="white" fontFamily="DM Sans,sans-serif" fontWeight="700">📍</text>}
                      <text x={x} y={y - m.radius - 6} textAnchor="middle" fontSize="9" fontFamily="DM Sans,sans-serif" fontWeight="700" fill={isYours ? "#0D7A4A" : color}>{m.name}</text>
                      {isYours && <text x={x} y={y - m.radius + 3} textAnchor="middle" fontSize="7" fontFamily="DM Sans,sans-serif" fill="#0D7A4A">Your Area</text>}
                      {isActive && (
                        <foreignObject x={Math.min(x - 80, W - 170)} y={Math.max(y - m.radius - 110, 8)} width="165" height="105">
                          <div style={{ background: "white", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", padding: "10px 12px", fontSize: 10, border: `2px solid ${isYours ? "#22C55E" : color}` }}>
                            <p style={{ fontFamily: "Fraunces,serif", fontWeight: 700, color: "#0D1F1A", marginBottom: 3 }}>📍 {m.name} — {m.pincode}</p>
                            <p style={{ color: isYours ? "#0D7A4A" : color, fontWeight: 700, marginBottom: 2 }}>Risk: {m.risk}</p>
                            <p style={{ color: "#6B7B74", fontFamily: "monospace", fontSize: 9 }}>TDS: {m.tds} ppm | pH: {m.ph}</p>
                            <p style={{ color: "#6B7B74" }}>Cases: {m.cases} this week</p>
                          </div>
                        </foreignObject>
                      )}
                    </g>
                  );
                })}
                {/* Legend */}
                <g transform={`translate(10, ${H - 68})`}>
                  <rect x="-4" y="-4" width="140" height="64" rx="6" fill="white" opacity="0.9" />
                  {[{ color: "#22C55E", label: "Your Area (781001)" }, { color: "#E53935", label: "High Risk" }, { color: "#FB8C00", label: "Medium Risk" }, { color: "#43A047", label: "Low Risk" }].map((l, i) => (
                    <g key={i} transform={`translate(4, ${i * 14})`}>
                      <circle cx="5" cy="5" r="4" fill={l.color} opacity="0.8" />
                      <text x="14" y="9" fontSize="8" fontFamily="DM Sans,sans-serif" fill="#374151">{l.label}</text>
                    </g>
                  ))}
                </g>
              </svg>
            </div>
          </motion.div>

          {/* Quick Actions (45%) */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-display text-lg font-bold text-[#0D1F1A] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  icon: "📋", title: "Post Survey", subtitle: "Create a new community health survey",
                  btn: "Post Survey →", btnBg: "#0D7A4A", bg: "#F0FAF7", border: "#C8EBD8",
                  onClick: () => setShowSurveyModal(true),
                },
                {
                  icon: "🦠", title: "Report Case", subtitle: "Submit a new disease case report",
                  btn: "Report Case →", btnBg: "#E53935", bg: "#FFEBEE", border: "#FFCDD2",
                  onClick: () => setShowCaseModal(true),
                },
                {
                  icon: "📰", title: "Post Article", subtitle: "Publish a health advisory or tip",
                  btn: "Write Article →", btnBg: "#1565C0", bg: "#EFF6FF", border: "#BFDBFE",
                  onClick: () => {},
                },
                {
                  icon: "📢", title: "Send Alert", subtitle: "Notify community via SMS/WhatsApp",
                  btn: "Send Now →", btnBg: "#FB8C00", bg: "#FFF7ED", border: "#FDE68A",
                  onClick: () => setShowAlertModal(true),
                },
              ].map((card) => (
                <motion.div key={card.title} whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="rounded-xl p-4 cursor-pointer border flex flex-col gap-2"
                  style={{ background: card.bg, borderColor: card.border }}>
                  <span className="text-3xl">{card.icon}</span>
                  <div>
                    <p className="font-display font-bold text-[#0D1F1A] text-sm leading-tight">{card.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{card.subtitle}</p>
                  </div>
                  <button onClick={card.onClick}
                    className="mt-auto w-full py-1.5 rounded-lg text-white text-xs font-semibold transition-opacity hover:opacity-90"
                    style={{ background: card.btnBg }}>
                    {card.btn}
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* 3 — Activity Feed */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Recent Activity</h3>
            <button className="text-xs text-[#2ED8A3] font-semibold hover:text-[#0D7A4A] transition-colors">View All →</button>
          </div>
          <div className="relative pl-4">
            {/* Vertical line */}
            <div className="absolute left-[6px] top-2 bottom-2 w-px bg-gray-200" />
            <div className="space-y-4">
              {ACTIVITY_FEED.map((item) => (
                <div key={item.id} className="relative flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm shrink-0 mt-1 z-10" style={{ background: item.color }} />
                  <div className="flex-1">
                    <p className="text-sm text-[#0D1F1A] font-medium">{item.icon} {item.text}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">🕐 {item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showSurveyModal && <PostSurveyModal onClose={() => setShowSurveyModal(false)} />}
        {showCaseModal && <ReportCaseModal onClose={() => setShowCaseModal(false)} />}
        {showAlertModal && <SendAlertModal onClose={() => setShowAlertModal(false)} />}
      </AnimatePresence>
    </>
  );
}
