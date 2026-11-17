import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ASHA_WORKER } from "../ashaData";

export default function AshaProfile() {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [passStrength, setPassStrength] = useState(0);
  const [notifications, setNotifications] = useState({ sms: true, email: true, whatsapp: true, inapp: true });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

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
      <h2 className="font-display text-[28px] font-bold text-[#0D1F1A]">My Profile</h2>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT — Profile card */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
            <div className="relative mb-3">
              <div className="w-20 h-20 rounded-full bg-[#0D7A4A] flex items-center justify-center text-white text-2xl font-bold font-display shadow-lg">
                {ASHA_WORKER.initials}
              </div>
              <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-white absolute bottom-0 right-0" />
            </div>
            <button className="text-xs text-[#0D7A4A] font-medium mb-3">Change Photo</button>
            <h3 className="font-display text-[22px] font-bold text-[#0D1F1A]">{ASHA_WORKER.name}</h3>
            <span className="mt-1.5 px-3 py-0.5 rounded-full bg-[#E8F5EE] text-[#0D7A4A] text-xs font-semibold border border-[#C8EBD8]">
              ASHA Worker
            </span>
            <p className="text-xs text-gray-400 mt-2">Serving since {ASHA_WORKER.servingSince}</p>
            <p className="text-xs text-gray-400 mt-0.5">Coverage: unit {ASHA_WORKER.unitId} (Chengalpattu Potheri)</p>

            <hr className="w-full my-4 border-gray-100" />

            <div className="w-full space-y-2.5 text-left">
              {[
                { icon: "📧", label: ASHA_WORKER.email },
                { icon: "📱", label: ASHA_WORKER.phone },
                { icon: "📍", label: ASHA_WORKER.address },
                { icon: "🏥", label: "PHC Potheri, Chengalpattu" },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-2.5">
                  <span className="text-base">{row.icon}</span>
                  <span className="text-xs text-gray-600">{row.label}</span>
                </div>
              ))}
            </div>

            <hr className="w-full my-4 border-gray-100" />
            <div className="w-full space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Account Actions</p>
              <button className="w-full py-2 rounded-xl border border-gray-200 text-sm font-medium text-[#0D1F1A] hover:bg-gray-50 transition-colors">Download My Data</button>
              <button className="w-full py-2 rounded-xl border border-red-200 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">Delete Account</button>
            </div>
          </div>

          {/* Work stats */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h4 className="font-display font-bold text-[#0D1F1A] mb-4 text-sm">Work Statistics</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Cases Reported", value: "47" },
                { label: "Surveys Posted", value: "5" },
                { label: "Articles Published", value: "4" },
                { label: "Citizens Covered", value: "248" },
                { label: "Alerts Sent", value: "12" },
                { label: "Months Active", value: "12" },
              ].map(s => (
                <div key={s.label} className="bg-[#F4F9F7] rounded-xl p-3 text-center">
                  <p className="font-display text-xl font-bold text-[#0D1F1A]">{s.value}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Edit form + Password + Notifications */}
        <div className="lg:col-span-3 space-y-5">
          {/* Edit form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-display text-xl font-bold text-[#0D1F1A] mb-5">Edit Profile Information</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Full Name</label>
                  <input defaultValue={ASHA_WORKER.name} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7A4A]/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone Number</label>
                  <input defaultValue={ASHA_WORKER.phone} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email (read-only)</label>
                <input defaultValue={ASHA_WORKER.email} disabled className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm text-gray-400 bg-gray-50 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Address</label>
                <textarea rows={2} defaultValue={ASHA_WORKER.address} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Primary Work Unit</label>
                  <input defaultValue={ASHA_WORKER.unitId}className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">District (auto-filled)</label>
                  <input defaultValue={ASHA_WORKER.district} disabled className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm text-gray-400 bg-gray-50 cursor-not-allowed" />
                </div>
              </div>
              <motion.button type="submit" whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ background: saved ? "#43A047" : "#0D7A4A" }}>
                {saved ? "✓ Changes Saved!" : "Save Changes"}
              </motion.button>
            </form>
          </div>

          {/* Change Password */}
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
                    <button className="w-full py-2.5 rounded-xl bg-[#0D7A4A] text-white text-sm font-semibold hover:bg-[#0D1F1A] transition-colors">Update Password</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notification toggles */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-display font-bold text-[#0D1F1A] mb-4 text-sm">Notification Settings</h3>
            <div className="space-y-3">
              {[{ key: "sms" as const, icon: "🔔", label: "Case Alert SMS" }, { key: "email" as const, icon: "📧", label: "Daily Summary Email" }, { key: "whatsapp" as const, icon: "💬", label: "WhatsApp Notifications" }, { key: "inapp" as const, icon: "📱", label: "In-App Notifications" }].map(pref => (
                <div key={pref.key} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2.5"><span>{pref.icon}</span><span className="text-sm font-medium text-[#0D1F1A]">{pref.label}</span></div>
                  <button onClick={() => setNotifications(n => ({ ...n, [pref.key]: !n[pref.key] }))}
                    className={`relative w-11 h-6 rounded-full transition-all ${notifications[pref.key] ? "bg-[#0D7A4A]" : "bg-gray-200"}`}>
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
