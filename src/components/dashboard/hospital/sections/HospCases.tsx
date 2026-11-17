import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle } from "lucide-react";
import {
  ALL_CASES, CASE_DISEASES, MODELED_DISEASES, PATIENTS_DATA, SEV_COLOR, SEV_BG, SEV_EMOJI, countBy,
  type CaseDisease, type HospitalCase, type Severity,
} from "../hospitalData";
import { TierBadge } from "@/components/ml/TierBadge";
import { useMl } from "@/lib/ml/MlContext";
import { TASK_META, formatScore, unitName, unitScore, unitTier } from "@/lib/ml/risk";

type SevFilter = "ALL" | Severity;
type DiseaseFilter = "All" | CaseDisease;
const SYMPTOM_LIST = ["Diarrhea", "Vomiting", "Fever", "Weakness", "Jaundice", "Dehydration", "Abdominal pain", "Skin rash", "Blood in stool", "Headache"];

// ─── Report Case Modal ────────────────────────────────────────────────────────
function ReportCaseModal({ onClose }: { onClose: () => void }) {
  const { units, homeUnit } = useMl();
  const [linkPatient, setLinkPatient] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState<Severity>("MODERATE");
  const toggle = (s: string) => setSymptoms(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="font-display text-xl font-bold text-[#0D1F1A]">🦠 Report New Case</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        {submitted ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4"><CheckCircle className="w-9 h-9 text-[#43A047]" /></div>
            <h3 className="font-display text-xl font-bold text-[#0D1F1A] mb-1">Case entry saved</h3>
            <p className="text-sm text-gray-500 mb-1">Reference: <span className="font-mono font-bold">CASE-068</span></p>
            <p className="text-xs text-gray-500 mb-6 max-w-xs">Demo form: nothing is sent anywhere. In the simulation, reported case counts are one of the weekly inputs the model reads.</p>
            <div className="flex gap-3 w-full max-w-xs">
              <button onClick={() => setSubmitted(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Add Another</button>
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-[#E53935] text-white text-sm font-semibold">Close</button>
            </div>
          </div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); setSubmitted(true); }} className="overflow-y-auto flex-1 p-6 space-y-4">
            {/* Link to patient */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={linkPatient} onChange={e => setLinkPatient(e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm font-semibold text-[#0D1F1A]">Link to existing patient</span>
            </label>
            {linkPatient ? (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Search Patient by Name or ID</label>
                <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none">
                  <option value="">Select patient…</option>
                  {PATIENTS_DATA.map(p => <option key={p.id} value={p.id}>{p.name} — {p.id}</option>)}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Age</label>
                  <input type="number" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" placeholder="e.g. 34" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">Gender</label>
                  <div className="flex gap-2">
                    {["M", "F", "O"].map(g => (
                      <label key={g} className="flex-1 py-2 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all border-gray-200 text-gray-500 hover:border-gray-300">
                        <input type="radio" name="gender" className="sr-only" />{g}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Symptoms */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Symptoms</label>
              <div className="grid grid-cols-2 gap-2">
                {SYMPTOM_LIST.map(s => (
                  <label key={s} onClick={() => toggle(s)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-xs font-medium transition-all ${symptoms.includes(s) ? "border-[#E53935] bg-[#FFEBEE] text-[#E53935]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                    <span>{symptoms.includes(s) ? "☑" : "☐"}</span>{s}
                  </label>
                ))}
              </div>
            </div>

            {/* Disease */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Suspected Condition</label>
              <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none">
                {CASE_DISEASES.map(d => <option key={d}>{d}</option>)}
              </select>
              <p className="mt-1 text-[10px] text-gray-400">The Sanjeevani model covers cholera and acute diarrheal disease only.</p>
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Patient&apos;s Area (synthetic unit)</label>
              <select defaultValue={homeUnit} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none">
                {units.map(u => <option key={u.unit_id} value={u.unit_id}>{u.name.replace(/_/g, " · ")} ({u.unit_id})</option>)}
                {units.length === 0 && <option value={homeUnit}>{homeUnit}</option>}
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Severity</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: "MILD" as Severity, label: "🟡 Mild", c: "#F59E0B", b: "#FFFDE7" }, { id: "MODERATE" as Severity, label: "🟠 Moderate", c: "#FB8C00", b: "#FFF3E0" }, { id: "SEVERE" as Severity, label: "🔴 Severe", c: "#E53935", b: "#FFEBEE" }].map(s => (
                  <button key={s.id} type="button" onClick={() => setSeverity(s.id)}
                    className="py-2.5 rounded-xl text-xs font-bold border-2 transition-all"
                    style={severity === s.id ? { borderColor: s.c, background: s.b, color: s.c } : { borderColor: "#E5E7EB", color: "#6B7280" }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Diagnosis Notes</label>
              <textarea rows={2} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none" placeholder="Clinical findings, diagnosis confirmed/suspected…" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Additional Observations</label>
              <textarea rows={2} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none" placeholder="Water source, possible contacts, etc." />
            </div>

            {/* Reported by */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Reported By</label>
              <input disabled value="Chengalpattu District Hospital (auto)" className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm text-gray-400 bg-gray-50 cursor-not-allowed" />
            </div>

            <button type="submit" className="w-full py-3 rounded-xl bg-[#E53935] text-white text-sm font-semibold hover:bg-red-700 transition-colors">Save Case Entry</button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// ─── Case Detail Slide-over ───────────────────────────────────────────────────
function CaseDetail({ c, onClose }: { c: HospitalCase; onClose: () => void }) {
  const { board, units, models } = useMl();
  const [status, setStatus] = useState(c.status);
  const unit = board?.units.find((u) => u.unit_id === c.unitId);
  const modeled = MODELED_DISEASES.includes(c.disease);
  const timeline = [
    { label: "Reported", date: `${c.reported} 06:42`, done: true },
    { label: "Diagnosed", date: `${c.reported} 09:15`, done: true },
    { label: "Under Treatment", date: `${c.reported} 14:00`, done: c.status !== "Recovered" },
    { label: "Recovered", date: "Pending", done: c.severity === "RECOVERED" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div initial={{ x: 540 }} animate={{ x: 0 }} exit={{ x: 540 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative w-full max-w-[520px] bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="font-display text-xl font-bold text-[#0D1F1A]">Case Details</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{c.id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        {/* Severity banner */}
        <div className="px-6 py-2.5 border-b-2" style={{ background: SEV_BG[c.severity], borderBottomColor: SEV_COLOR[c.severity] }}>
          <p className="font-bold text-sm" style={{ color: SEV_COLOR[c.severity] }}>{SEV_EMOJI[c.severity]} {c.severity} — {c.status}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex items-center justify-between bg-[#EFF6FF] rounded-xl px-4 py-3">
            <span className="text-xs font-medium text-[#1565C0]">Patient: <strong>{c.patient}</strong>, {c.gender}, {c.age}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{ l: "Condition", v: c.disease }, { l: "Area (unit)", v: `${unitName(units, c.unitId)} (${c.unitId})` }, { l: "Reported", v: c.reported }, { l: "In model scope", v: modeled ? "Yes" : "No" }].map(r => (
              <div key={r.l} className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{r.l}</p>
                <p className="text-sm font-semibold text-[#0D1F1A]">{r.v}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Symptoms</p>
            <div className="flex flex-wrap gap-2">
              {c.symptoms.map(s => <span key={s} className="px-3 py-1 rounded-full text-xs font-medium bg-[#FFEBEE] text-[#E53935]">{s}</span>)}
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Clinical Notes</p>
            <p className="text-sm text-gray-600 leading-relaxed">{c.notes}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Treatment Notes</label>
            <textarea rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none" placeholder="Add treatment notes…" />
          </div>
          {c.severity !== "RECOVERED" && (
            <div className="flex gap-2">
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none">
                <option>Under Treatment</option><option>Hospitalized</option><option>Recovered</option><option>Critical</option>
              </select>
              <button className="px-4 py-2.5 rounded-xl bg-[#1565C0] text-white text-sm font-semibold hover:bg-blue-900 transition-colors">Update</button>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Status Timeline</p>
            <div className="relative pl-4 space-y-3">
              <div className="absolute left-[6px] top-2 bottom-2 w-px bg-gray-200" />
              {timeline.map(t => (
                <div key={t.label} className="flex items-start gap-3 relative">
                  <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm shrink-0 mt-0.5 z-10 ${t.done ? "bg-[#22C55E]" : "bg-gray-200"}`} />
                  <div>
                    <p className={`text-sm font-medium ${t.done ? "text-[#0D1F1A]" : "text-gray-400"}`}>{t.label}</p>
                    <p className="text-[11px] text-gray-400">{t.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Model status of the patient's area this week */}
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Area model status this week</p>
            {unit ? (
              <div className="space-y-2">
                {(["m1", "m2"] as const).map((task) => (
                  <div key={task} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{TASK_META[task].short} · {TASK_META[task].name}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#0D1F1A]">{formatScore(unitScore(unit, task))}</span>
                      <TierBadge tier={unitTier(unit, task)} />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No saved scores for this unit in the selected week.</p>
            )}
            <p className="mt-2 text-[10px] leading-4 text-gray-400">
              Scores describe the area in the saved synthetic run, not this patient. This case entry is sample content and does not feed the model
              {models ? ` (${models.m1.model_name}).` : "."}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Cases Section ────────────────────────────────────────────────────────────
export default function HospCases() {
  const { units } = useMl();
  const [sevFilter, setSevFilter] = useState<SevFilter>("ALL");
  const [diseaseFilter, setDiseaseFilter] = useState<DiseaseFilter>("All");
  const [selectedCase, setSelectedCase] = useState<HospitalCase | null>(null);
  const [showReport, setShowReport] = useState(false);

  // A recovered patient is counted under "Recovered" only, so the four cards add up to the number of entries
  const bySeverity = countBy(ALL_CASES, c => (c.status === "Recovered" ? "RECOVERED" : c.severity));
  const filtered = ALL_CASES.filter(c => {
    const matchSev = sevFilter === "ALL" || (c.status === "Recovered" ? "RECOVERED" : c.severity) === sevFilter;
    const matchDisease = diseaseFilter === "All" || c.disease === diseaseFilter;
    return matchSev && matchDisease;
  });

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-[28px] font-bold text-[#0D1F1A]">Case Management</h2>
            <p className="text-sm text-gray-500">Sample case entries for the hospital workflow. The model covers cholera and acute diarrheal disease only.</p>
          </div>
          <button onClick={() => setShowReport(true)} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity" style={{ background: "#E53935" }}>+ Report New Case</button>
        </div>

        {/* Stats (counted from the sample entries below) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([
            { label: "Severe", key: "SEVERE", color: "#E53935", bg: "#FFEBEE" },
            { label: "Moderate", key: "MODERATE", color: "#FB8C00", bg: "#FFF3E0" },
            { label: "Mild", key: "MILD", color: "#F59E0B", bg: "#FFFDE7" },
            { label: "Recovered", key: "RECOVERED", color: "#43A047", bg: "#E8F5E9" },
          ]).map(s => (
            <div key={s.label} className="rounded-2xl p-5 border" style={{ background: s.bg, borderColor: s.color + "30" }}>
              <p className="font-display text-3xl font-bold" style={{ color: s.color }}>{bySeverity[s.key] ?? 0}</p>
              <p className="text-xs font-semibold mt-1" style={{ color: s.color }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {(["ALL", "SEVERE", "MODERATE", "MILD", "RECOVERED"] as SevFilter[]).map(f => (
              <button key={f} onClick={() => setSevFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${sevFilter === f ? "bg-[#0D1F1A] text-white border-[#0D1F1A]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                {f === "ALL" ? "All" : f === "SEVERE" ? "🔴 Severe" : f === "MODERATE" ? "🟠 Moderate" : f === "MILD" ? "🟡 Mild" : "✅ Recovered"}
              </button>
            ))}
          </div>
          <select value={diseaseFilter} onChange={e => setDiseaseFilter(e.target.value as DiseaseFilter)} aria-label="Condition filter"
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none">
            {["All", ...CASE_DISEASES].map(d => <option key={d}>{d}</option>)}
          </select>
        </div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[11px] text-gray-500 uppercase tracking-wider">
                  {["Case ID", "Patient", "Age/Gender", "Condition", "Symptoms", "Severity", "Status", "Area", "Reported", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[#0D1F1A]">{c.id}</td>
                    <td className="px-4 py-3 font-medium text-[#0D1F1A]">{c.patient}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{c.age} {c.gender}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{c.disease}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.symptoms.slice(0, 2).map(s => <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FFEBEE] text-[#E53935]">{s}</span>)}
                        {c.symptoms.length > 2 && <span className="text-[10px] text-gray-400">+{c.symptoms.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ color: SEV_COLOR[c.severity], background: SEV_BG[c.severity] }}>
                        {SEV_EMOJI[c.severity]} {c.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{c.status}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{unitName(units, c.unitId)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{c.reported}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedCase(c)} className="text-xs font-semibold text-[#1565C0] hover:text-blue-900 transition-colors">View</button>
                        {c.severity !== "RECOVERED" && (
                          <><span className="text-gray-200">|</span>
                          <button onClick={() => setSelectedCase(c)} className="text-xs font-semibold text-[#FB8C00] hover:text-orange-700 transition-colors">Update</button></>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">No entries match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showReport && <ReportCaseModal onClose={() => setShowReport(false)} />}
        {selectedCase && <CaseDetail c={selectedCase} onClose={() => setSelectedCase(null)} />}
      </AnimatePresence>
    </>
  );
}
