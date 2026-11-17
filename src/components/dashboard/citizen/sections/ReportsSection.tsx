import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MY_REPORTS } from "../mockData";
import { X, Upload, CheckCircle } from "lucide-react";

type Report = typeof MY_REPORTS[number];

const STATUS_COLORS: Record<Report["status"], { bg: string; text: string; border: string; leftBorder: string }> = {
  "Under Review": { bg: "#FFFBEB", text: "#B45309", border: "#FDE68A", leftBorder: "#F59E0B" },
  "Resolved": { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0", leftBorder: "#22C55E" },
  "Submitted": { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE", leftBorder: "#3B82F6" },
};

function ReportFormModal({ onClose }: { onClose: () => void }) {
  const [reportType, setReportType] = useState("water");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-display text-xl font-bold text-[#0D1F1A]">Submit New Report</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
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
            <p className="text-sm text-gray-500 mb-3">Reference: <span className="font-mono font-bold">RPT-2026-0849</span></p>
            <p className="text-sm text-gray-500 mb-6">An ASHA worker will review within 24 hours.</p>
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-[#0D1F1A] text-white text-sm font-semibold hover:bg-[#1A3D2B] transition-colors">Close</button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Report Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: "water", icon: "💧", label: "Water Quality Issue" }, { id: "symptom", icon: "🤒", label: "Symptom Report" }, { id: "other", icon: "⚠️", label: "Other Issue" }].map((opt) => (
                  <button key={opt.id} type="button" onClick={() => setReportType(opt.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${reportType === opt.id ? "border-[#0D1F1A] bg-[#F4F9F7] text-[#0D1F1A]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    <span className="text-xl">{opt.icon}</span>
                    <span className="text-center leading-tight">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
              <textarea rows={3} placeholder="Describe what you observed..." className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D1F1A]/20 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Location</label>
              <input type="text" defaultValue="Chengalpattu Urban (TN_03)" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1F1A]/20" />
            </div>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-gray-300 cursor-pointer">
              <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">📎 Drag photo here or click to upload</p>
              <p className="text-[11px] text-gray-400">Optional — helps with verification</p>
            </div>
            <button type="submit" className="w-full py-3 rounded-xl bg-[#0D1F1A] text-white text-sm font-semibold hover:bg-[#1A3D2B] transition-colors">Submit Report</button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default function ReportsSection() {
  const [showModal, setShowModal] = useState(false);
  const stats = [
    { label: "Total Reports", value: 4, color: "#0D1F1A" },
    { label: "Under Review", value: 2, color: "#F59E0B" },
    { label: "Resolved", value: 2, color: "#22C55E" },
  ];

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[28px] font-bold text-[#0D1F1A]">My Reports</h2>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 rounded-xl bg-[#0D7A4A] text-white text-sm font-semibold hover:bg-[#0D1F1A] transition-colors flex items-center gap-2"
          >
            + Submit New Report
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="font-display text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Reports list */}
        <div className="space-y-3">
          {MY_REPORTS.map((report) => {
            const sc = STATUS_COLORS[report.status];
            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="flex" style={{ borderLeft: `4px solid ${sc.leftBorder}` }}>
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#0D1F1A]">{report.id}</span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {report.typeIcon} {report.type}
                        </span>
                      </div>
                      <span
                        className="text-[11px] font-bold px-3 py-1 rounded-full border shrink-0"
                        style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}
                      >
                        {report.status === "Under Review" ? "🟡" : report.status === "Resolved" ? "🟢" : "🔵"} {report.status}
                      </span>
                    </div>
                    <p className="text-sm text-[#0D1F1A] font-medium mb-1">"{report.desc}"</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                      <span>📍 {report.area}</span>
                      <span>📅 {report.date}</span>
                      <span>👩‍⚕️ {report.assignee}</span>
                    </div>
                  </div>
                  <div className="flex items-center pr-5">
                    <button className="text-xs font-semibold text-[#2ED8A3] hover:text-[#0D7A4A] transition-colors whitespace-nowrap">
                      View Details
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {showModal && <ReportFormModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </>
  );
}
