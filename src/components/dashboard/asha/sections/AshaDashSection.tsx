import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, Send } from "lucide-react";
import { ACTIVITY_FEED } from "../ashaData";
import { ClusterBlock } from "@/components/ml/ClusterPanels";
import { MlGate } from "@/components/ml/MlGate";
import { TaskToggle } from "@/components/ml/TaskToggle";
import { TierBadge } from "@/components/ml/TierBadge";
import { UnitDrilldown } from "@/components/ml/UnitDrilldown";
import { UnitMap } from "@/components/ml/UnitMap";
import { useMl, useUnitHistory } from "@/lib/ml/MlContext";
import {
  TASK_META, TIER_META, formatInt, formatScore, formatWeek, neighborIds, rankUnits, unitName, unitScore, unitTier,
} from "@/lib/ml/risk";
import type { TaskId, Tier } from "@/lib/ml/types";

// ─── Post Survey Modal ────────────────────────────────────────────────────────
function PostSurveyModal({ onClose }: { onClose: () => void }) {
  const { homeUnit } = useMl();
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
            <h3 className="font-display text-xl font-bold text-[#0D1F1A] mb-1">Survey saved</h3>
            <p className="text-sm text-gray-500 mb-6">Demo form: nothing is sent. In a real rollout, citizens in {homeUnit} would be notified.</p>
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
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Target Unit</label>
                <input defaultValue={homeUnit} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
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
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-[#0D7A4A] text-white text-sm font-semibold hover:bg-[#0D1F1A] transition-colors">Save Survey</button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// ─── Report Case Modal ────────────────────────────────────────────────────────
function ReportCaseModal({ onClose }: { onClose: () => void }) {
  const { homeUnit } = useMl();
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
            <h3 className="font-display text-xl font-bold text-[#0D1F1A] mb-1">Case entry saved</h3>
            <p className="text-sm text-gray-500 mb-1">Reference: <span className="font-mono font-bold">PAT-011</span></p>
            <p className="text-sm text-gray-500 mb-6">Demo form: nothing is sent. In the simulation, ASHA-reported counts are one of the weekly inputs the model reads.</p>
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
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Suspected Condition</label>
              <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none">
                <option>Cholera (suspected)</option><option>Acute diarrheal disease</option><option>Other (not modeled)</option>
              </select>
              <p className="mt-1 text-[10px] text-gray-400">The Sanjeevani model covers cholera and acute diarrheal disease only.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Severity</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: "mild", label: "🟡 Mild", color: "#FDD835", bg: "#FFFDE7" }, { id: "moderate", label: "🟠 Moderate", color: "#FB8C00", bg: "#FFF3E0" }, { id: "severe", label: "🔴 Severe", color: "#E53935", bg: "#FFEBEE" }].map(s => (
                  <button key={s.id} type="button" onClick={() => setSeverity(s.id)}
                    className="py-2.5 rounded-xl text-xs font-bold border-2 transition-all"
                    style={severity === s.id ? { borderColor: s.color, background: s.bg, color: s.color } : { borderColor: "#E5E7EB", color: "#6B7280" }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Unit</label>
              <input defaultValue={homeUnit} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Notes</label>
              <textarea rows={2} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none resize-none" placeholder="Additional clinical notes..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Reported By</label>
              <input disabled value="Priya Sharma (ASHA Worker)" className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm text-gray-400 bg-gray-50 cursor-not-allowed" />
            </div>
            <button type="submit" className="w-full py-3 rounded-xl bg-[#E53935] text-white text-sm font-semibold hover:bg-red-700 transition-colors">Save Case Entry</button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// ─── Community advisory draft (nothing is broadcast) ──────────────────────────
function AdvisoryModal({ onClose }: { onClose: () => void }) {
  const { homeUnit, units, board } = useMl();
  const [saved, setSaved] = useState(false);
  const home = board?.units.find((u) => u.unit_id === homeUnit);
  const tier = unitTier(home, home?.m1 ? "m1" : "m2") ?? "routine";
  const name = unitName(units, homeUnit);
  const drafts: Record<Tier, string> = {
    review: `HEALTH NOTICE (${name}): Please boil or treat all drinking water and keep ORS at home. Tell your ASHA worker early if anyone has diarrhea or vomiting.`,
    watch: `HEALTH NOTICE (${name}): Please boil or treat drinking water and wash hands with soap. Report diarrhea or vomiting to your ASHA worker.`,
    routine: `HEALTH TIP (${name}): Keep using boiled or treated drinking water and wash hands with soap. Report any water problem to your ASHA worker.`,
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-display text-xl font-bold text-[#0D1F1A]">📢 Draft Community Advisory</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        {saved ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-[#43A047]" />
            </div>
            <h3 className="font-display text-xl font-bold text-[#0D1F1A] mb-1">Draft saved</h3>
            <p className="text-sm text-gray-500 mb-6">Nothing was sent. The Sanjeevani experiment does not send citizen alerts; a real broadcast would need approval from the responsible health officer.</p>
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-[#FB8C00] text-white text-sm font-semibold">Close</button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSaved(true); }} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Target Unit</label>
              <input defaultValue={homeUnit} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Advisory text (general prevention advice)</label>
              <textarea key={tier} rows={4} defaultValue={drafts[tier]} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none resize-none" />
              <p className="text-[10px] text-gray-400 mt-1">Pre-filled from this week&apos;s {TIER_META[tier].label} tier for your unit. Keep under 160 characters for SMS.</p>
            </div>
            <button type="submit" className="w-full py-3 rounded-xl bg-[#FB8C00] text-white text-sm font-semibold hover:bg-orange-700 transition-colors flex items-center justify-center gap-2">
              <Send className="w-4 h-4" /> Save Draft
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// ─── Model-driven part of the dashboard ───────────────────────────────────────
function CoveragePanel() {
  const { board, units, homeUnit, models, date } = useMl();
  const [task, setTask] = useState<TaskId>("m1");
  const [selectedChoice, setSelected] = useState<string | null>(null);
  const coverage = useMemo(() => [homeUnit, ...neighborIds(units, homeUnit)], [units, homeUnit]);
  const selected = selectedChoice && coverage.includes(selectedChoice) ? selectedChoice : homeUnit;
  const { history } = useUnitHistory(homeUnit, 2);

  const home = board?.units.find((u) => u.unit_id === homeUnit);
  const covered = coverage.map((id) => board?.units.find((u) => u.unit_id === id)).filter((u): u is NonNullable<typeof u> => Boolean(u));
  const flagged = (tier: Tier) => covered.filter((u) => unitTier(u, task) === tier).length;

  const cases = home?.signals.asha_cases_7d ?? null;
  const prior = history && history.points.length > 1 ? history.points[history.points.length - 2].signals.asha_cases_7d ?? null : null;
  const delta = cases != null && prior != null ? cases - prior : null;
  const homeTier = unitTier(home, task);
  const selectedUnit = board?.units.find((u) => u.unit_id === selected);
  const ranked = rankUnits(board, task).filter((u) => coverage.includes(u.unit_id));

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">ASHA-reported cases this week</p>
          <div className="flex items-end gap-3 mb-2">
            <span className="font-display text-5xl font-bold" style={{ color: "#E53935" }}>{formatInt(cases)}</span>
            {delta != null && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full mb-1.5" style={{ background: delta > 0 ? "#FFEBEE" : "#E8F5E9", color: delta > 0 ? "#E53935" : "#43A047" }}>
                {delta > 0 ? "↑ +" : delta < 0 ? "↓ " : "→ "}{formatInt(delta)} vs last week
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-3">{unitName(units, homeUnit)} · 7-day count the model reads as input</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{TASK_META[task].name} · your unit</p>
            <TierBadge tier={homeTier} />
          </div>
          <div className="flex items-end gap-3 mb-2">
            <span className="font-display text-5xl font-bold" style={{ color: TIER_META[homeTier ?? "routine"].color }}>{formatScore(unitScore(home, task))}</span>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            {task === "m1" && !home?.m1 ? "An event is already active here, so early warning does not apply this week."
              : `Review at ≥ ${models?.[task].f1_threshold?.toFixed(3) ?? "—"}, Watch at ≥ ${models?.[task].recall_threshold?.toFixed(3) ?? "—"}`}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Flags in your coverage area</p>
          <div className="flex items-end gap-3 mb-2">
            <span className="font-display text-5xl font-bold text-[#1A6B4A]">{flagged("review") + flagged("watch")}</span>
            <span className="mb-1.5 text-xs text-gray-500">of {covered.length} units</span>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs font-semibold text-[#E53935]">🔴 {flagged("review")} Review</span>
            <span className="text-xs font-semibold text-[#FB8C00]">🟠 {flagged("watch")} Watch</span>
            <span className="text-xs font-semibold text-[#43A047]">🟢 {flagged("routine")} Routine</span>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-11 gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="lg:col-span-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Your Coverage Area</h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{unitName(units, homeUnit)} and {coverage.length - 1} neighbouring units · week of {formatWeek(date)}</p>
            </div>
            <TaskToggle task={task} onChange={setTask} />
          </div>
          <UnitMap units={units} board={board} task={task} onlyIds={coverage} homeId={homeUnit} selectedId={selected} onSelect={setSelected} height={330} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-display text-lg font-bold text-[#0D1F1A] mb-3">Review list</h3>
          <div className="space-y-2">
            {ranked.map((u) => (
              <button key={u.unit_id} onClick={() => setSelected(u.unit_id)}
                className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${selected === u.unit_id ? "border-[#0D7A4A] bg-[#F4FBF8]" : "border-gray-100 hover:bg-gray-50"}`}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: unitTier(u, task) ? TIER_META[unitTier(u, task) as Tier].color : "#9CA3AF" }} />
                <span className="flex-1 text-sm font-medium text-[#0D1F1A] truncate">{unitName(units, u.unit_id)}{u.unit_id === homeUnit ? " · yours" : ""}</span>
                <span className="font-mono text-xs text-gray-500">{formatScore(unitScore(u, task))}</span>
                <TierBadge tier={unitTier(u, task)} />
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-gray-400">Highest score first. Use it to decide where to visit first, not as a diagnosis.</p>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-display text-lg font-bold text-[#0D1F1A] mb-4">{unitName(units, selected)} — what the model saw</h3>
        <UnitDrilldown profile={units.find((u) => u.unit_id === selected)} unit={selectedUnit} models={models} />
      </motion.div>

      <ClusterBlock panels={["regime", "coverage", "hotspots", "seasonal"]} unitId={homeUnit} />
    </>
  );
}

// ─── Dashboard Section ────────────────────────────────────────────────────────
export default function AshaDashboard() {
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [showAdvisoryModal, setShowAdvisoryModal] = useState(false);

  return (
    <>
      <div className="space-y-6">
        <MlGate>
          <CoveragePanel />
        </MlGate>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-display text-lg font-bold text-[#0D1F1A] mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: "📋", title: "Post Survey", subtitle: "Create a new community health survey", btn: "Post Survey →", btnBg: "#0D7A4A", bg: "#F0FAF7", border: "#C8EBD8", onClick: () => setShowSurveyModal(true) },
              { icon: "🦠", title: "Report Case", subtitle: "Add a disease case entry", btn: "Report Case →", btnBg: "#E53935", bg: "#FFEBEE", border: "#FFCDD2", onClick: () => setShowCaseModal(true) },
              { icon: "📰", title: "Post Article", subtitle: "Publish a health advisory or tip", btn: "Write Article →", btnBg: "#1565C0", bg: "#EFF6FF", border: "#BFDBFE", onClick: () => {} },
              { icon: "📢", title: "Draft Advisory", subtitle: "Prepare a prevention message (not sent)", btn: "Draft Now →", btnBg: "#FB8C00", bg: "#FFF7ED", border: "#FDE68A", onClick: () => setShowAdvisoryModal(true) },
            ].map((card) => (
              <motion.div key={card.title} whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="rounded-xl p-4 cursor-pointer border flex flex-col gap-2" style={{ background: card.bg, borderColor: card.border }}>
                <span className="text-3xl">{card.icon}</span>
                <div>
                  <p className="font-display font-bold text-[#0D1F1A] text-sm leading-tight">{card.title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{card.subtitle}</p>
                </div>
                <button onClick={card.onClick} className="mt-auto w-full py-1.5 rounded-lg text-white text-xs font-semibold transition-opacity hover:opacity-90" style={{ background: card.btnBg }}>
                  {card.btn}
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Activity Feed */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Recent Activity (sample)</h3>
          </div>
          <div className="relative pl-4">
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
        {showAdvisoryModal && <AdvisoryModal onClose={() => setShowAdvisoryModal(false)} />}
      </AnimatePresence>
    </>
  );
}
