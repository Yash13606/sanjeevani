import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CITIZEN } from "../mockData";

type Gender = "male" | "female" | "other";

export default function ProfileSection() {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [gender, setGender] = useState<Gender>("male");
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState({
    sms: true, email: true, whatsapp: true, inapp: true,
  });

  const [passStrength, setPassStrength] = useState(0);

  const handlePassChange = (val: string) => {
    let strength = 0;
    if (val.length >= 8) strength++;
    if (/[A-Z]/.test(val)) strength++;
    if (/[0-9]/.test(val)) strength++;
    if (/[^A-Za-z0-9]/.test(val)) strength++;
    setPassStrength(strength);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-[28px] font-bold text-[#0D1F1A]">My Profile</h2>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT — Profile card (35%) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="relative mb-3">
              <div className="w-20 h-20 rounded-full bg-[#0D1F1A] flex items-center justify-center text-white text-2xl font-bold font-display shadow-lg">
                {CITIZEN.initials}
              </div>
              <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-white absolute bottom-0 right-0" />
            </div>
            <button className="text-xs text-[#0D7A4A] font-medium hover:text-[#0D1F1A] transition-colors mb-3">Change Photo</button>
            <h3 className="font-display text-[22px] font-bold text-[#0D1F1A]">{CITIZEN.name}</h3>
            <span className="mt-1.5 px-3 py-0.5 rounded-full bg-[#E8F5EE] text-[#0D7A4A] text-xs font-semibold border border-[#C8EBD8]">
              Citizen
            </span>
            <p className="text-xs text-gray-400 mt-2">Member since {CITIZEN.memberSince}</p>

            <hr className="w-full my-4 border-gray-100" />

            {/* Info rows */}
            <div className="w-full space-y-2.5 text-left">
              {[
                { icon: "📧", label: CITIZEN.email },
                { icon: "📱", label: CITIZEN.phone },
                { icon: "📍", label: `${CITIZEN.address}, ${CITIZEN.state}` },
                { icon: "🏷️", label: `Synthetic unit: ${CITIZEN.unitId}` },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2.5">
                  <span className="text-base">{row.icon}</span>
                  <span className="text-xs text-gray-600">{row.label}</span>
                </div>
              ))}
            </div>

            <hr className="w-full my-4 border-gray-100" />

            {/* Account actions */}
            <div className="w-full space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Account Actions</p>
              <button className="w-full py-2 rounded-xl border border-gray-200 text-sm font-medium text-[#0D1F1A] hover:bg-gray-50 transition-colors">
                Change Password
              </button>
              <button className="w-full py-2 rounded-xl border border-gray-200 text-sm font-medium text-[#0D1F1A] hover:bg-gray-50 transition-colors">
                Download My Data
              </button>
              <button className="w-full py-2 rounded-xl border border-red-200 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                Delete Account
              </button>
            </div>
          </div>

          {/* Activity summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h4 className="font-display font-bold text-[#0D1F1A] mb-4 text-sm">My Activity</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Reports Submitted", value: "4" },
                { label: "Surveys Completed", value: "2" },
                { label: "Alerts Received", value: "7" },
                { label: "Member For", value: "68 days" },
              ].map((s) => (
                <div key={s.label} className="bg-[#F4F9F7] rounded-xl p-3 text-center">
                  <p className="font-display text-xl font-bold text-[#0D1F1A]">{s.value}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Edit form + Password + Notifications (65%) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Edit Profile Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-display text-xl font-bold text-[#0D1F1A] mb-5">Edit Profile Information</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Full Name</label>
                  <input defaultValue={CITIZEN.name} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1F1A]/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone Number</label>
                  <input defaultValue={CITIZEN.phone} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1F1A]/20" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email (read-only)</label>
                <input defaultValue={CITIZEN.email} disabled className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm text-gray-400 bg-gray-50 cursor-not-allowed" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Age</label>
                  <input defaultValue={CITIZEN.age} type="number" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1F1A]/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Gender</label>
                  <div className="flex gap-2">
                    {(["male", "female", "other"] as Gender[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all capitalize ${
                          gender === g ? "bg-[#0D1F1A] text-white border-[#0D1F1A]" : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Address</label>
                <textarea rows={2} defaultValue={CITIZEN.address} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1F1A]/20 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Synthetic unit ID</label>
                  <input defaultValue={CITIZEN.unitId}className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1F1A]/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">District</label>
                  <input defaultValue={CITIZEN.district} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1F1A]/20" />
                </div>
              </div>
              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ background: saved ? "#43A047" : "#0D7A4A" }}
              >
                {saved ? "✓ Changes Saved!" : "Save Changes"}
              </motion.button>
            </form>
          </div>

          {/* Change Password (collapsible) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setPasswordOpen(!passwordOpen)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="font-display font-bold text-[#0D1F1A] text-sm">🔑 Change Password</span>
              {passwordOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            <AnimatePresence>
              {passwordOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-5 pt-0 space-y-4">
                    <div className="h-px bg-gray-100" />
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Current Password</label>
                      <input type="password" placeholder="••••••••" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1F1A]/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">New Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        onChange={(e) => handlePassChange(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1F1A]/20"
                      />
                      {/* Strength bar */}
                      <div className="flex gap-1 mt-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="flex-1 h-1.5 rounded-full transition-all"
                            style={{
                              background: passStrength >= i
                                ? i <= 1 ? "#E53935" : i <= 2 ? "#FB8C00" : i <= 3 ? "#FDD835" : "#43A047"
                                : "#E5E7EB"
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {passStrength === 0 ? "Enter a password" : passStrength === 1 ? "Weak" : passStrength === 2 ? "Fair" : passStrength === 3 ? "Good" : "Strong"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Confirm Password</label>
                      <input type="password" placeholder="••••••••" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1F1A]/20" />
                    </div>
                    <button className="w-full py-2.5 rounded-xl bg-[#0D7A4A] text-white text-sm font-semibold hover:bg-[#0D1F1A] transition-colors">
                      Update Password
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-display font-bold text-[#0D1F1A] mb-4 text-sm">Notification Settings</h3>
            <div className="space-y-3">
              {[
                { key: "sms" as const, icon: "🔔", label: "SMS Alerts" },
                { key: "email" as const, icon: "📧", label: "Email Notifications" },
                { key: "whatsapp" as const, icon: "💬", label: "WhatsApp Alerts" },
                { key: "inapp" as const, icon: "📱", label: "In-App Notifications" },
              ].map((pref) => (
                <div key={pref.key} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2.5">
                    <span>{pref.icon}</span>
                    <span className="text-sm font-medium text-[#0D1F1A]">{pref.label}</span>
                  </div>
                  {/* Toggle */}
                  <button
                    onClick={() => setNotifications((n) => ({ ...n, [pref.key]: !n[pref.key] }))}
                    className={`relative w-11 h-6 rounded-full transition-all ${notifications[pref.key] ? "bg-[#0D7A4A]" : "bg-gray-200"}`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${notifications[pref.key] ? "left-5" : "left-0.5"}`}
                    />
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
