import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ArrowUpRight, X, Upload, CheckCircle } from "lucide-react";
import { ARTICLES, SURVEYS } from "../mockData";
import { ClusterBlock } from "@/components/ml/ClusterPanels";
import { MlGate } from "@/components/ml/MlGate";
import { SignalPanel } from "@/components/ml/SignalPanel";
import { TaskToggle } from "@/components/ml/TaskToggle";
import { TierBadge } from "@/components/ml/TierBadge";
import { useMl } from "@/lib/ml/MlContext";
import {
  TASK_META, TIER_META, formatScore, formatWeek, neighborIds, observedSignals, unitName, unitScore, unitTier,
} from "@/lib/ml/risk";
import type { TaskId, Tier } from "@/lib/ml/types";

// ─── Report Modal ─────────────────────────────────────────────────────────────
function ReportModal({ onClose, areaLabel }: { onClose: () => void; areaLabel: string }) {
  const [reportType, setReportType] = useState<string>("water");
  const [desc, setDesc] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-display text-xl font-bold text-[#0D1F1A]">Report a Problem</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-9 h-9 text-[#43A047]" />
              </div>
            </motion.div>
            <h3 className="font-display text-xl font-bold text-[#0D1F1A] mb-1">Report Submitted ✓</h3>
            <p className="text-sm text-gray-500 mb-3">Reference: <span className="font-mono font-bold text-[#0D1F1A]">RPT-2026-0848</span></p>
            <p className="text-sm text-gray-500 mb-2">An ASHA worker will review within 24 hours.</p>
            <p className="text-xs text-gray-400 mb-6">Demo form: nothing is sent anywhere, and reports do not feed the ML model in this experiment.</p>
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-[#0D1F1A] text-white text-sm font-semibold hover:bg-[#1A3D2B] transition-colors">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Report type */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Report Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "water", icon: "💧", label: "Water Quality Issue" },
                  { id: "symptom", icon: "🤒", label: "Symptom Report" },
                  { id: "other", icon: "⚠️", label: "Other Issue" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setReportType(opt.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                      reportType === opt.id
                        ? "border-[#0D1F1A] bg-[#F4F9F7] text-[#0D1F1A]"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <span className="text-center leading-tight">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
              <textarea
                rows={4}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Describe what you observed..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-[#0D1F1A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D1F1A]/20 focus:border-[#0D1F1A]/30 resize-none"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Area</label>
              <input
                type="text"
                defaultValue={areaLabel}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-[#0D1F1A] focus:outline-none focus:ring-2 focus:ring-[#0D1F1A]/20"
              />
            </div>

            {/* Photo upload */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Photo (Optional)</label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center hover:border-gray-300 cursor-pointer transition-colors">
                <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-gray-500">📎 Drag photo here or click to upload</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Optional — helps with verification</p>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#0D1F1A] text-white text-sm font-semibold hover:bg-[#1A3D2B] transition-colors"
            >
              Submit Report
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// General prevention guidance by tier. It is not medical advice and not produced by the model.
const ADVICE: Record<Tier, { icon: string; text: string }[]> = {
  review: [
    { icon: "⚠️", text: "Boil drinking water for at least 10 minutes" },
    { icon: "⚠️", text: "Keep ORS at home for diarrhea or vomiting" },
    { icon: "⚠️", text: "Report symptoms to your ASHA worker early" },
    { icon: "✅", text: "Wash hands with soap before meals" },
  ],
  watch: [
    { icon: "⚠️", text: "Boil or treat drinking water" },
    { icon: "⚠️", text: "Wash hands with soap before meals" },
    { icon: "✅", text: "Know where ORS is available" },
    { icon: "✅", text: "Report symptoms early" },
  ],
  routine: [
    { icon: "✅", text: "Keep using boiled or treated drinking water" },
    { icon: "✅", text: "Wash hands regularly" },
    { icon: "✅", text: "Report any water problem you notice" },
  ],
};

// ─── Model-driven section ─────────────────────────────────────────────────────
function AreaStatus({ onOpenMap }: { onOpenMap?: () => void }) {
  const { board, units, homeUnit, date, models } = useMl();
  const [task, setTask] = useState<TaskId>("m1");
  const home = board?.units.find((u) => u.unit_id === homeUnit);

  // Early warning is only defined for units without an active event; otherwise describe the active event.
  const headline: TaskId = home?.m1 ? "m1" : "m2";
  const tier = unitTier(home, headline) ?? "routine";
  const meta = TIER_META[tier];
  const signals = home ? observedSignals(home.signals) : [];
  const neighbours = neighborIds(units, homeUnit);

  return (
    <>
      {/* 1 — Personal status card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl shadow-sm border overflow-hidden"
        style={{ background: meta.bg, borderColor: `${meta.color}33` }}
      >
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Your Area</p>
            <h3 className="font-display text-2xl font-bold text-[#0D1F1A] leading-tight">{unitName(units, homeUnit)}</h3>
            <p className="text-sm text-gray-500 mt-0.5">Synthetic unit {homeUnit} · Tamil Nadu-style simulation</p>
            <p className="mt-3 text-xs text-gray-500">Model week of <strong>{formatWeek(date)}</strong> (weekly Monday decision, end of day)</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" style={{ animation: "spin 8s linear infinite" }}>
                <circle cx="50" cy="50" r="46" fill="none" stroke={meta.color} strokeWidth="3" strokeDasharray="12 6" opacity="0.6" />
              </svg>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="white" stroke={meta.color} strokeWidth="4" />
              </svg>
              <div className="relative z-10 text-center">
                <div className="text-xl">{meta.emoji}</div>
                <div className="text-xs font-bold leading-tight mt-0.5" style={{ color: meta.color }}>
                  {meta.label.toUpperCase()}
                </div>
              </div>
            </div>
            <p className="text-center text-[11px] text-gray-600">
              {TASK_META[headline].name}: score {formatScore(unitScore(home, headline))}
              {headline === "m2" && <><br />An event is already active here, so early warning is not scored</>}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">General precautions:</p>
            <ul className="space-y-1.5">
              {ADVICE[tier].map((item) => (
                <li key={item.text} className="flex items-start gap-2 text-xs text-gray-700">
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="px-6 py-2.5 border-t" style={{ borderColor: `${meta.color}26`, background: "rgba(255,255,255,0.5)" }}>
          <p className="text-xs text-gray-600">
            <span className="font-semibold">Signals seen this week:</span>{" "}
            {signals.length ? signals.slice(0, 3).join(" · ") : "nothing unusual in the observed signals"}
          </p>
        </div>
      </motion.div>

      {/* 2 — Two column: neighbours + signals */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Neighbouring Areas</h3>
            <div className="flex items-center gap-3">
              <TaskToggle task={task} onChange={setTask} />
              {onOpenMap && (
                <button onClick={onOpenMap} className="text-xs text-[#0D7A4A] font-semibold flex items-center gap-1 hover:underline">
                  View Full Map <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          {neighbours.length === 0 ? (
            <p className="text-sm text-gray-500">No neighbouring units are listed for this area.</p>
          ) : (
            <div className="space-y-2">
              {neighbours.map((id) => {
                const unit = board?.units.find((u) => u.unit_id === id);
                const neighbourTier = unitTier(unit, task);
                return (
                  <div key={id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-[#F8FFFE] transition-colors group">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: neighbourTier ? TIER_META[neighbourTier].color : "#9CA3AF" }} />
                    <span className="text-sm font-medium text-[#0D1F1A] flex-1">{unitName(units, id)}</span>
                    <span className="text-xs text-gray-400 font-mono">{id}</span>
                    <TierBadge tier={neighbourTier} />
                    <span className="text-xs text-gray-500 font-mono w-14 text-right">{formatScore(unitScore(unit, task))}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-3 text-[11px] text-gray-400">
            Review: score ≥ {models?.[task].f1_threshold?.toFixed(3) ?? "—"} · Watch: score ≥ {models?.[task].recall_threshold?.toFixed(3) ?? "—"}.
            {" "}{TASK_META[task].question}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Water &amp; Weather Inputs</h3>
            <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">Weekly</span>
          </div>
          <p className="text-xs text-gray-400 font-mono mb-4">{homeUnit} · week of {formatWeek(date)}</p>
          {home ? <SignalPanel signals={home.signals} compact /> : <p className="text-sm text-gray-500">No saved signals for this unit.</p>}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-[10px] text-gray-400">These are the weekly inputs the model received. They are not live readings and there is no pH input.</p>
          </div>
        </motion.div>
      </div>
    </>
  );
}

// ─── Dashboard Overview Section ───────────────────────────────────────────────
export default function DashOverview({ onOpenMap }: { onOpenMap?: () => void }) {
  const [showReportModal, setShowReportModal] = useState(false);
  const { units, homeUnit } = useMl();
  const areaLabel = `${unitName(units, homeUnit)} (${homeUnit})`;

  return (
    <>
      <div className="space-y-6">
        <MlGate>
          <AreaStatus onOpenMap={onOpenMap} />
          <ClusterBlock panels={["regime", "archetype", "coverage", "hotspots"]} />
        </MlGate>

        {/* 3 — Health Articles */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Health Advisories</h3>
            <button className="text-xs text-[#2ED8A3] font-semibold hover:text-[#0D7A4A] transition-colors">View All →</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ARTICLES.map((article) => (
              <motion.div
                key={article.id}
                whileHover={{ y: -4, boxShadow: "0 12px 30px -8px rgba(0,0,0,0.12)" }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="border border-gray-100 rounded-xl p-4 cursor-pointer"
              >
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{ color: article.tagColor, background: article.tagBg }}
                >
                  {article.tag}
                </span>
                <h4 className="font-display text-sm font-bold text-[#0D1F1A] mt-2.5 mb-1.5 leading-snug">{article.title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">{article.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-600">{article.author}</p>
                    <p className="text-[10px] text-gray-400">{article.role} · {article.date}</p>
                  </div>
                  <button className="text-xs text-[#2ED8A3] font-semibold hover:text-[#0D7A4A] transition-colors whitespace-nowrap">
                    Read More →
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* 4 — Active Surveys */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-bold text-[#0D1F1A]">Community Surveys</h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#E8F5F0] text-[#0D7A4A]">3 Active</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SURVEYS.map((survey) => {
              const pct = Math.round((survey.responses / survey.total) * 100);
              return (
                <div key={survey.id} className="border border-gray-100 rounded-xl p-4">
                  <h4 className="font-display text-sm font-bold text-[#0D1F1A] mb-1 leading-snug">{survey.title}</h4>
                  <p className="text-xs text-gray-500 mb-3">{survey.desc}</p>
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                      🕐 {survey.deadline}
                    </span>
                  </div>
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                      <span>{survey.responses} / {survey.total} responses</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-[#2ED8A3] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <button className="w-full py-2 rounded-lg text-xs font-semibold text-white bg-[#0D7A4A] hover:bg-[#0D1F1A] transition-colors">
                    Take Survey
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* 5 — Report a Problem Banner */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl p-6 flex items-center justify-between gap-4"
          style={{ background: "linear-gradient(135deg, #E8F5F0 0%, #F0FAF7 100%)", border: "1px solid #C8EBE0" }}
        >
          <div className="flex items-center gap-4">
            <span className="text-3xl">🚨</span>
            <div>
              <p className="font-display font-bold text-[#0D1F1A] text-base">Notice a water issue or feeling unwell?</p>
              <p className="text-sm text-gray-600 mt-0.5">Tell your ASHA worker early: early care is the best protection</p>
            </div>
          </div>
          <button
            onClick={() => setShowReportModal(true)}
            className="shrink-0 px-5 py-2.5 rounded-xl bg-[#0D1F1A] text-white text-sm font-semibold hover:bg-[#1A3D2B] transition-colors whitespace-nowrap"
          >
            Report Now →
          </button>
        </motion.div>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && <ReportModal areaLabel={areaLabel} onClose={() => setShowReportModal(false)} />}
      </AnimatePresence>
    </>
  );
}
