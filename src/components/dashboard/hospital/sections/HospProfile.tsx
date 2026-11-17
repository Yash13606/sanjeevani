import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ALL_CASES, HOSPITAL, PATIENTS_DATA, countBy } from "../hospitalData";
import { useMl } from "@/lib/ml/MlContext";
import { formatInt, neighborIds, unitName, unitTier } from "@/lib/ml/risk";

export default function HospProfile() {
  const { board, units, homeUnit } = useMl();
  const catchment = [homeUnit, ...neighborIds(units, homeUnit)];
  const inReview = board
    ? catchment.filter((id) => {
        const unit = board.units.find((u) => u.unit_id === id);
        return unitTier(unit, "m1") === "review" || unitTier(unit, "m2") === "review";
      }).length
    : null;
  const homeSignals = board?.units.find((u) => u.unit_id === homeUnit)?.signals;
  const conditionCounts = Object.entries(countBy(ALL_CASES, (c) => c.disease)).sort((a, b) => b[1] - a[1]);
  const topCondition = conditionCounts[0]?.[0] ?? "n/a";
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [passStrength, setPassStrength] = useState(0);
  const [notifications, setNotifications] = useState({ sms: true, email: true, whatsapp: true, inapp: true });

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 2500); };
  const checkPass = (val: string) => {
    let s = 0;
    if (val.length >= 8) s++;
    if (/[A-Z]/.test(val)) s++;
    if (/[0-9]/.test(val)) s++;
    if (/[^A-Za-z0-9]/.test(val)) s++;
    setPassStrength(s);
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-[28px] font-bold text-[#0D1F1A]">Hospital Profile</h2>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT — info card */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
            {/* Hospital avatar */}
            <div className="relative mb-3">
              <div className="w-20 h-20 rounded-2xl bg-[#1565C0] flex items-center justify-center text-white text-2xl font-bold font-display shadow-lg">
                {HOSPITAL.initials}
              </div>
              <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-white absolute -bottom-1 -right-1" />
            </div>
            <h3 className="font-display text-xl font-bold text-[#0D1F1A] mt-1">{HOSPITAL.name}</h3>
            <span className="mt-1.5 px-3 py-0.5 rounded-full bg-[#EFF6FF] text-[#1565C0] text-xs font-semibold border border-blue-200">Hospital</span>
            <p className="text-xs text-gray-400 mt-2">Active since {HOSPITAL.activeSince}</p>

            <hr className="w-full my-4 border-gray-100" />
            <div className="w-full space-y-2.5 text-left">
              {[{ icon: "📧", label: HOSPITAL.email }, { icon: "📱", label: HOSPITAL.phone }, { icon: "📍", label: `${HOSPITAL.address} (${HOSPITAL.unitId})` }, { icon: "👨‍⚕️", label: `Head: ${HOSPITAL.headDoctor}` }].map(r => (
                <div key={r.label} className="flex items-center gap-2.5">
                  <span className="text-base">{r.icon}</span>
                  <span className="text-xs text-gray-600">{r.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hospital Stats */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h4 className="font-display font-bold text-[#0D1F1A] mb-4 text-sm">Hospital Statistics</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Sample case entries", value: String(ALL_CASES.length) },
                { label: "Sample patient records", value: String(PATIENTS_DATA.length) },
                { label: "Catchment units in review", value: inReview == null ? "—" : String(inReview) },
                { label: "OPD cases this week", value: formatInt(homeSignals?.opd_cases_7d) },
              ].map(s => (
                <div key={s.label} className="bg-[#EFF6FF] rounded-xl p-3 text-center">
                  <p className="font-display text-xl font-bold text-[#1565C0]">{s.value}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 bg-[#EFF6FF] rounded-xl p-3 text-center">
              <p className="text-xs font-semibold text-[#1565C0]">Most common condition in sample records: {topCondition}</p>
            </div>
            <p className="mt-3 text-[10px] leading-4 text-gray-400">
              Catchment = {unitName(units, homeUnit)} and its neighbouring units in the saved synthetic run. Case and patient figures are demo content.
            </p>
          </div>
        </div>

        {/* RIGHT — form + toggles */}
        <div className="lg:col-span-3 space-y-5">
          {/* Edit form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-display text-xl font-bold text-[#0D1F1A] mb-5">Hospital Information</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Hospital Name</label>
                <input defaultValue={HOSPITAL.name} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Head Doctor Name</label>
                  <input defaultValue={HOSPITAL.headDoctor} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone Number</label>
                  <input defaultValue={HOSPITAL.phone} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email (read-only)</label>
                <input disabled defaultValue={HOSPITAL.email} className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm text-gray-400 bg-gray-50 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Address</label>
                <textarea rows={2} defaultValue={HOSPITAL.address} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Synthetic unit ID</label>
                  <input disabled defaultValue={HOSPITAL.unitId} className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm text-gray-400 bg-gray-50 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">District (auto-filled)</label>
                  <input disabled defaultValue={HOSPITAL.district} className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm text-gray-400 bg-gray-50 cursor-not-allowed" />
                </div>
              </div>
              <motion.button type="submit" whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ background: saved ? "#43A047" : "#1565C0" }}>
                {saved ? "✓ Changes Saved!" : "Save Changes"}
              </motion.button>
            </form>
          </div>

          {/* Password */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button onClick={() => setPasswordOpen(!passwordOpen)} className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors">
              <span className="font-display font-bold text-[#0D1F1A] text-sm">🔑 Change Password</span>
              {passwordOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            <AnimatePresence>
              {passwordOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="px-6 pb-5 space-y-4">
                    <div className="h-px bg-gray-100" />
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Current Password</label>
                      <input type="password" placeholder="••••••••" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">New Password</label>
                      <input type="password" placeholder="••••••••" onChange={e => checkPass(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
                      <div className="flex gap-1 mt-2">
                        {[1,2,3,4].map(i => (
                          <div key={i} className="flex-1 h-1.5 rounded-full transition-all" style={{ background: passStrength >= i ? (i<=1?"#E53935":i<=2?"#FB8C00":i<=3?"#FDD835":"#43A047") : "#E5E7EB" }} />
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{["Enter a password","Weak","Fair","Good","Strong"][passStrength]}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Confirm Password</label>
                      <input type="password" placeholder="••••••••" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
                    </div>
                    <button className="w-full py-2.5 rounded-xl bg-[#1565C0] text-white text-sm font-semibold hover:bg-blue-900 transition-colors">Update Password</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notification settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-display font-bold text-[#0D1F1A] mb-1 text-sm">Notification Settings</h3>
            <p className="mb-4 text-[11px] text-gray-400">Demo preferences only: this experiment does not send SMS, email or WhatsApp alerts.</p>
            <div className="space-y-3">
              {[{ key: "sms" as const, icon: "🔔", label: "SMS Critical Alerts" }, { key: "email" as const, icon: "📧", label: "Email Weekly Summary" }, { key: "whatsapp" as const, icon: "💬", label: "WhatsApp Outbreak Alerts" }, { key: "inapp" as const, icon: "📱", label: "In-App Notifications" }].map(pref => (
                <div key={pref.key} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2.5"><span>{pref.icon}</span><span className="text-sm font-medium text-[#0D1F1A]">{pref.label}</span></div>
                  <button onClick={() => setNotifications(n => ({ ...n, [pref.key]: !n[pref.key] }))}
                    className={`relative w-11 h-6 rounded-full transition-all ${notifications[pref.key] ? "bg-[#1565C0]" : "bg-gray-200"}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${notifications[pref.key] ? "left-5" : "left-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
