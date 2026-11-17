import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { ARTICLES_DATA } from "../ashaData";

const ALL_TAGS = ["All", "Prevention", "Cholera", "Hygiene", "Water Safety", "Emergency", "Community"];

type Article = typeof ARTICLES_DATA[number];

const STATUS_COLORS = {
  published: { bg: "#E8F5E9", text: "#43A047", label: "🟢 Published" },
  draft: { bg: "#FFFDE7", text: "#F59E0B", label: "🟡 Draft" },
} as const;

// ─── Write Article Modal ──────────────────────────────────────────────────────
function WriteArticleModal({ onClose }: { onClose: () => void }) {
  const [tags, setTags] = useState<string[]>(["Prevention"]);
  const [tagInput, setTagInput] = useState("");
  const [published, setPublished] = useState(false);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="font-display text-xl font-bold text-[#0D1F1A]">📰 Write Health Advisory</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        {published ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="font-display text-xl font-bold text-[#0D1F1A] mb-1">Article Published!</h3>
            <p className="text-sm text-gray-500 mb-6">Your health advisory is now visible to citizens in your coverage area.</p>
            <button onClick={onClose} className="px-8 py-2.5 rounded-xl bg-[#0D7A4A] text-white text-sm font-semibold">Done</button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setPublished(true); }} className="overflow-y-auto flex-1 p-6 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Article Title</label>
              <input className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base font-semibold text-[#0D1F1A] placeholder:text-gray-300 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0D7A4A]/20" placeholder="e.g. How to Stay Safe During Flood Season" />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(t => (
                  <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E8F5E9] text-[#43A047] text-xs font-semibold">
                    {t}
                    <button type="button" onClick={() => setTags(ts => ts.filter(x => x !== t))} className="text-[#43A047] hover:text-red-500 ml-0.5">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none" placeholder="Type tag and press Enter" />
                <button type="button" onClick={addTag} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium">+ Add</button>
              </div>
            </div>

            {/* Target audience */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Target Audience</label>
              <div className="flex gap-2">
                {["All Citizens", "Specific Unit"].map(opt => (
                  <label key={opt} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium cursor-pointer hover:border-gray-300">
                    <input type="radio" name="audience" className="w-3.5 h-3.5" defaultChecked={opt === "All Citizens"} /> {opt}
                  </label>
                ))}
              </div>
            </div>

            {/* Rich text editor (styled textarea with toolbar) */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Content</label>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200 flex-wrap">
                  {[
                    { label: "B", title: "Bold", style: "font-bold" },
                    { label: "I", title: "Italic", style: "italic" },
                    { label: "H1", title: "Heading", style: "font-mono" },
                    { label: "• List", title: "List", style: "" },
                    { label: "—", title: "Divider", style: "" },
                  ].map(btn => (
                    <button key={btn.label} type="button" title={btn.title}
                      className={`px-2.5 py-1 rounded text-xs border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 transition-colors ${btn.style}`}>
                      {btn.label}
                    </button>
                  ))}
                </div>
                <textarea rows={8} className="w-full px-4 py-3 text-sm text-gray-700 resize-none focus:outline-none" 
                  placeholder={`Write your health advisory here...\n\nShare prevention tips, outbreak information, or health education content for your community.`} />
              </div>
            </div>

            {/* Cover image */}
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center hover:border-gray-300 cursor-pointer transition-colors">
              <p className="text-2xl mb-1">🖼️</p>
              <p className="text-xs font-medium text-gray-500">Click to upload cover image (optional)</p>
              <p className="text-[11px] text-gray-400 mt-0.5">JPG, PNG up to 5MB</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button type="button" className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Save Draft</button>
              <button type="submit" className="flex-1 py-3 rounded-xl bg-[#0D7A4A] text-white text-sm font-semibold hover:bg-[#0D1F1A] transition-colors">Publish Article →</button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// ─── Articles Section ─────────────────────────────────────────────────────────
export default function ArticlesSection() {
  const [activeTab, setActiveTab] = useState<"mine" | "all">("mine");
  const [activeTag, setActiveTag] = useState("All");
  const [search, setSearch] = useState("");
  const [showWriteModal, setShowWriteModal] = useState(false);

  const filtered = ARTICLES_DATA.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
    const matchTag = activeTag === "All" || a.tags.includes(activeTag);
    return matchSearch && matchTag;
  });

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[28px] font-bold text-[#0D1F1A]">Health Articles & Advisories</h2>
          <button onClick={() => setShowWriteModal(true)} className="px-5 py-2.5 rounded-xl bg-[#0D7A4A] text-white text-sm font-semibold hover:bg-[#0D1F1A] transition-colors">
            + Write New Article
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {[{ id: "mine", label: "My Articles" }, { id: "all", label: "All Articles" }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === t.id ? "bg-white text-[#0D1F1A] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles…"
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1F1A]/20 min-w-48" />
          <div className="flex gap-2 flex-wrap">
            {ALL_TAGS.map(tag => (
              <button key={tag} onClick={() => setActiveTag(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${activeTag === tag ? "bg-[#0D1F1A] text-white border-[#0D1F1A]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Articles grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((article) => {
            const sc = STATUS_COLORS[article.status];
            return (
              <motion.div key={article.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: sc.bg, color: sc.text }}>{sc.label}</span>
                  <span className="text-[10px] text-gray-400 font-mono">{article.id}</span>
                </div>

                <h3 className="font-display font-bold text-[#0D1F1A] text-base leading-snug mb-2">{article.title}</h3>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {article.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-semibold">{t}</span>
                  ))}
                </div>

                <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-2">{article.excerpt}</p>

                <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-4">
                  <span>✍️ {article.author}</span>
                  <span>📅 {article.date}</span>
                  {article.views > 0 && <span>👁️ {article.views} views</span>}
                  {article.comments > 0 && <span>💬 {article.comments}</span>}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {article.status === "published" && (
                    <>
                      <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0D1F1A] border border-gray-200 hover:bg-gray-50 transition-colors">Edit</button>
                      <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#2ED8A3] border border-[#2ED8A3]/30 hover:bg-[#F0FAF7] transition-colors">View</button>
                      <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 border border-red-200 hover:bg-red-50 transition-colors">Unpublish</button>
                    </>
                  )}
                  {article.status === "draft" && (
                    <>
                      <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#F59E0B] border border-yellow-200 hover:bg-yellow-50 transition-colors">Complete Draft</button>
                      <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0D7A4A] hover:bg-[#0D1F1A] transition-colors">Publish</button>
                      <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 border border-red-200 hover:bg-red-50 transition-colors">Delete</button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {showWriteModal && <WriteArticleModal onClose={() => setShowWriteModal(false)} />}
      </AnimatePresence>
    </>
  );
}
