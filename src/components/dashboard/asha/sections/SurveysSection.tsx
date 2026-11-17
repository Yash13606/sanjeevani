import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, Plus, Trash2 } from "lucide-react";
import { SURVEYS_DATA, SURVEY_RESULTS } from "../ashaData";

type Survey = typeof SURVEYS_DATA[number];

// ─── Survey Results View ──────────────────────────────────────────────────────
function SurveyResultsView({ survey, onClose }: { survey: Survey; onClose: () => void }) {
  const results = SURVEY_RESULTS[survey.id as keyof typeof SURVEY_RESULTS];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="font-display text-xl font-bold text-[#0D1F1A]">{survey.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{survey.responses} responses · {results?.completionRate ?? 80}% completion rate</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[{ label: "Total Responses", value: survey.responses }, { label: "Max Target", value: survey.maxResponses }, { label: "Completion Rate", value: `${results?.completionRate ?? 80}%` }].map(s => (
              <div key={s.label} className="bg-[#F4F9F7] rounded-xl p-4 text-center">
                <p className="font-display text-2xl font-bold text-[#0D1F1A]">{s.value}</p>
                <p className="text-[11px] text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {results ? (
            results.questions.map((q, qi) => (
              <div key={qi} className="space-y-3">
                <p className="font-semibold text-sm text-[#0D1F1A]">Q{qi + 1}. {q.text}</p>
                {q.type === "rating" && Array.isArray(q.data) && (
                  <div className="space-y-1.5">
                    {q.data.map((count, i) => {
                      const max = Math.max(...(q.data as number[]));
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-14">{"⭐".repeat(i + 1)}</span>
                          <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#2ED8A3] transition-all" style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                          <span className="text-xs font-mono text-gray-500 w-6">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {q.type === "yesno" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#E8F5E9] rounded-xl p-4 text-center">
                      <p className="font-display text-2xl font-bold text-[#43A047]">{q.yes}</p>
                      <p className="text-xs text-gray-500 mt-1">Yes</p>
                    </div>
                    <div className="bg-[#FFEBEE] rounded-xl p-4 text-center">
                      <p className="font-display text-2xl font-bold text-[#E53935]">{q.no}</p>
                      <p className="text-xs text-gray-500 mt-1">No</p>
                    </div>
                  </div>
                )}
                {q.type === "mcq" && Array.isArray(q.options) && Array.isArray(q.values) && (
                  <div className="space-y-1.5">
                    {q.options.map((opt: string, i: number) => {
                      const val = (q.values as number[])[i];
                      const max = Math.max(...(q.values as number[]));
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 w-16">{opt}</span>
                          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#0D7A4A] transition-all" style={{ width: `${(val / max) * 100}%` }} />
                          </div>
                          <span className="text-xs font-mono text-gray-500 w-6">{val}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📊</p>
              <p className="font-display text-lg font-bold text-[#0D1F1A]">Results Processing</p>
              <p className="text-sm text-gray-500 mt-1">Survey closed — results will be ready within 24 hours.</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t shrink-0 flex gap-2">
          <button className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Download CSV</button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-[#0D1F1A] text-white text-sm font-semibold">Close</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Post Survey Multi-Step Modal ─────────────────────────────────────────────
type StepId = "details" | "questions" | "preview" | "published";
const STEPS: StepId[] = ["details", "questions", "preview", "published"];

type QuestionType = "rating" | "yesno" | "mcq" | "text";
interface Question { id: number; text: string; type: QuestionType; options: string[] }

const DEFAULT_QUESTIONS: Question[] = [
  { id: 1, text: "How would you rate your tap water quality?", type: "rating", options: [] },
  { id: 2, text: "Have you experienced any water-borne symptoms this week?", type: "yesno", options: [] },
  { id: 3, text: "What is your primary water source?", type: "mcq", options: ["Tap", "River", "Well", "Tanker"] },
];

function PostSurveyModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<StepId>("details");
  const [questions, setQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);
  const stepIndex = STEPS.indexOf(step);

  const addQuestion = () => setQuestions(qs => [...qs, { id: Date.now(), text: "", type: "text", options: [] }]);
  const removeQuestion = (id: number) => setQuestions(qs => qs.filter(q => q.id !== id));
  const updateQuestion = (id: number, patch: Partial<Question>) => setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...patch } : q));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header with step indicator */}
        <div className="px-6 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-[#0D1F1A]">Post New Survey</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
          </div>
          {step !== "published" && (
            <div className="flex items-center gap-2">
              {(["details", "questions", "preview"] as StepId[]).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${stepIndex >= ["details","questions","preview"].indexOf(s) ? "bg-[#0D7A4A] text-white" : "bg-gray-200 text-gray-400"}`}>{i + 1}</div>
                  <span className={`text-[11px] font-medium capitalize ${stepIndex >= i ? "text-[#0D7A4A]" : "text-gray-400"}`}>{s}</span>
                  {i < 2 && <div className={`flex-1 h-px w-8 ${stepIndex > i ? "bg-[#0D7A4A]" : "bg-gray-200"}`} />}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {/* STEP 1: Details */}
          {step === "details" && (
            <div className="space-y-4">
              <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Survey Title</label>
                <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7A4A]/20" placeholder="e.g. April Water Quality Survey" /></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Description</label>
                <textarea rows={3} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none" placeholder="Brief purpose of this survey..." /></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Target Units</label>
                <input defaultValue="TN_01" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" placeholder="Type a unit ID (for example TN_01)" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Start Date</label><input type="date" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" /></div>
                <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">End Date</label><input type="date" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" /></div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Max Responses</label>
                <input type="number" defaultValue="100" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" /></div>
            </div>
          )}

          {/* STEP 2: Questions */}
          {step === "questions" && (
            <div className="space-y-4">
              {questions.map((q, qi) => (
                <div key={q.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400">Q{qi + 1}</span>
                    <button onClick={() => removeQuestion(q.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <input value={q.text} onChange={e => updateQuestion(q.id, { text: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none" placeholder="Question text..." />
                  <select value={q.type} onChange={e => updateQuestion(q.id, { type: e.target.value as QuestionType })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none">
                    <option value="rating">Rating (1-5)</option>
                    <option value="yesno">Yes / No</option>
                    <option value="mcq">Multiple Choice</option>
                    <option value="text">Text Answer</option>
                  </select>
                  {q.type === "mcq" && (
                    <div className="space-y-1.5">
                      {q.options.map((opt, oi) => (
                        <input key={oi} value={opt} onChange={e => { const opts = [...q.options]; opts[oi] = e.target.value; updateQuestion(q.id, { options: opts }); }}
                          className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none" placeholder={`Option ${oi + 1}`} />
                      ))}
                      <button onClick={() => updateQuestion(q.id, { options: [...q.options, ""] })}
                        className="text-xs text-[#0D7A4A] font-semibold hover:text-[#0D1F1A]">+ Add Option</button>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addQuestion} className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-500 hover:border-[#0D7A4A] hover:text-[#0D7A4A] transition-colors flex items-center justify-center gap-1.5">
                <Plus className="w-4 h-4" /> Add Question
              </button>
            </div>
          )}

          {/* STEP 3: Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="bg-[#F4F9F7] rounded-xl p-4 border border-[#C8EBD8]">
                <p className="text-xs text-gray-500 mb-1">Preview — This is how citizens will see it</p>
                <h3 className="font-display font-bold text-[#0D1F1A] text-lg">Survey Title</h3>
              </div>
              {questions.map((q, qi) => (
                <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-[#0D1F1A] mb-3">Q{qi + 1}. {q.text || "Untitled question"}</p>
                  {q.type === "rating" && <div className="flex gap-2">{[1,2,3,4,5].map(n => <button key={n} className="w-9 h-9 rounded-full border-2 border-gray-200 text-sm font-bold text-gray-500 hover:border-[#2ED8A3]">{n}</button>)}</div>}
                  {q.type === "yesno" && <div className="flex gap-3"><button className="px-5 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600">Yes</button><button className="px-5 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600">No</button></div>}
                  {q.type === "mcq" && <div className="space-y-1.5">{q.options.map((opt, i) => <label key={i} className="flex items-center gap-2 text-sm text-gray-600"><input type="radio" name={`q${qi}`} className="w-4 h-4" />{opt}</label>)}</div>}
                  {q.type === "text" && <textarea rows={2} disabled placeholder="Citizen will type here..." className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 resize-none" />}
                </div>
              ))}
            </div>
          )}

          {/* STEP 4: Published */}
          {step === "published" && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-9 h-9 text-[#43A047]" /></div>
              <h3 className="font-display text-xl font-bold text-[#0D1F1A] mb-1">Survey Published! 🎉</h3>
              <p className="text-sm text-gray-500 mb-6">Demo form: nothing is sent. In a real rollout, citizens in the target units would be notified.</p>
              <button onClick={onClose} className="px-8 py-2.5 rounded-xl bg-[#0D7A4A] text-white text-sm font-semibold">Done</button>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        {step !== "published" && (
          <div className="px-6 py-4 border-t shrink-0 flex gap-2">
            {step !== "details" && (
              <button onClick={() => setStep(STEPS[stepIndex - 1])} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">← Back</button>
            )}
            <button
              onClick={() => setStep(step === "preview" ? "published" : STEPS[stepIndex + 1])}
              className="flex-1 py-2.5 rounded-xl bg-[#0D7A4A] text-white text-sm font-semibold hover:bg-[#0D1F1A] transition-colors">
              {step === "preview" ? "✓ Publish Survey" : "Next →"}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Surveys Section ──────────────────────────────────────────────────────────
export default function SurveysSection() {
  const [activeTab, setActiveTab] = useState<"mine" | "all">("mine");
  const [viewResultsSurvey, setViewResultsSurvey] = useState<Survey | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[28px] font-bold text-[#0D1F1A]">Surveys</h2>
          <button onClick={() => setShowPostModal(true)} className="px-5 py-2.5 rounded-xl bg-[#0D7A4A] text-white text-sm font-semibold hover:bg-[#0D1F1A] transition-colors">
            + Post New Survey
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {[{ id: "mine", label: "My Surveys" }, { id: "all", label: "All Active Surveys" }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === t.id ? "bg-white text-[#0D1F1A] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[{ label: "Active", value: "2", color: "#0D7A4A" }, { label: "Closed", value: "3", color: "#E53935" }, { label: "Total Responses", value: "186", color: "#0D1F1A" }].map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
              <p className="font-display text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Survey cards */}
        <div className="space-y-4">
          {SURVEYS_DATA.map((survey) => {
            const pct = Math.round((survey.responses / survey.maxResponses) * 100);
            const isActive = survey.status === "active";
            return (
              <motion.div key={survey.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isActive ? "bg-[#E8F5E9] text-[#43A047]" : "bg-[#FFEBEE] text-[#E53935]"}`}>
                        {isActive ? "🟢 Active" : "🔴 Closed"}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">{survey.id}</span>
                    </div>
                    <h3 className="font-display font-bold text-[#0D1F1A] text-base leading-tight">{survey.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{survey.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-400 mb-3 flex-wrap">
                  <span>📍 Units: {survey.target}</span>
                  <span>📅 {isActive ? `Closes: ${survey.closeDate}` : `Closed: ${survey.closeDate}`}</span>
                  <span>❓ {survey.questions} questions</span>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>{survey.responses} / {survey.maxResponses} responses</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: isActive ? "#2ED8A3" : "#9CA3AF" }} />
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setViewResultsSurvey(survey)} className="px-4 py-2 rounded-xl bg-[#0D1F1A] text-white text-xs font-semibold hover:bg-[#1A3D2B] transition-colors">
                    View Results
                  </button>
                  {isActive && <button className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">Edit</button>}
                  {isActive && <button className="px-4 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-500 hover:bg-red-50">Close Survey</button>}
                  {!isActive && <button className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">Download CSV</button>}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {viewResultsSurvey && <SurveyResultsView survey={viewResultsSurvey} onClose={() => setViewResultsSurvey(null)} />}
        {showPostModal && <PostSurveyModal onClose={() => setShowPostModal(false)} />}
      </AnimatePresence>
    </>
  );
}
