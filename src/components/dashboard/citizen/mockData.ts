// ─── Sample content for the Citizen dashboard ─────────────────────────────────
// Only the persona, advisories, surveys and reports are sample content. Everything about area risk,
// water and weather signals comes from the saved synthetic ML run (see src/lib/ml).

export const CITIZEN = {
  name: "Rahul Bora",
  initials: "RB",
  email: "rahul.bora@email.com",
  phone: "+91 98540-XXXXX",
  age: 28,
  gender: "male" as const,
  address: "Ward 12, Chengalpattu Urban",
  /** The synthetic unit this persona lives in (see ml/config/tamil_nadu_districts.yaml). */
  unitId: "TN_03",
  district: "Chengalpattu",
  state: "Tamil Nadu (synthetic unit)",
  memberSince: "January 2026",
};

export const ARTICLES = [
  {
    id: 1,
    tag: "Prevention",
    tagColor: "#43A047",
    tagBg: "#E8F5E9",
    title: "How to purify water at home",
    excerpt: "Safe water is your first defense against water-borne diseases. Learn these simple steps...",
    author: "Anita Devi",
    role: "ASHA Worker",
    date: "Mar 8, 2026",
  },
  {
    id: 2,
    tag: "Cholera",
    tagColor: "#E53935",
    tagBg: "#FFEBEE",
    title: "Early warning signs you must know",
    excerpt: "Cholera can escalate quickly. Recognizing these early symptoms can save lives in your community.",
    author: "Dr. R. Sharma",
    role: "District Hospital",
    date: "Mar 7, 2026",
  },
  {
    id: 3,
    tag: "Hygiene",
    tagColor: "#1565C0",
    tagBg: "#E3F2FD",
    title: "5 daily habits that prevent outbreaks",
    excerpt: "Small daily habits can make a big difference in preventing the spread of disease in your area.",
    author: "Priya Das",
    role: "ASHA Worker",
    date: "Mar 6, 2026",
  },
];

export const SURVEYS = [
  {
    id: 1,
    title: "Water Quality Feedback Survey",
    desc: "Help us understand water issues in your area",
    deadline: "Closes Mar 15",
    responses: 47,
    total: 100,
  },
  {
    id: 2,
    title: "Community Health Assessment",
    desc: "Monthly health status survey for your area",
    deadline: "Closes Mar 20",
    responses: 23,
    total: 100,
  },
  {
    id: 3,
    title: "Monthly Symptom Tracker",
    desc: "Track and report symptoms in your household",
    deadline: "Closes Mar 25",
    responses: 67,
    total: 100,
  },
];

export const MY_REPORTS = [
  {
    id: "RPT-2026-0847",
    type: "Water Quality Issue",
    typeIcon: "💧",
    desc: "Foul smell from tap water at Ward 12",
    area: "Chengalpattu Urban (TN_03)",
    date: "Mar 8, 2026",
    status: "Under Review" as const,
    assignee: "Priya Sharma (ASHA Worker)",
  },
  {
    id: "RPT-2026-0821",
    type: "Symptom Report",
    typeIcon: "🤒",
    desc: "Persistent diarrhea for 2 days",
    area: "Chengalpattu Urban (TN_03)",
    date: "Mar 5, 2026",
    status: "Resolved" as const,
    assignee: "Anita Devi (ASHA Worker)",
  },
  {
    id: "RPT-2026-0798",
    type: "Water Quality Issue",
    typeIcon: "💧",
    desc: "Brown colored water from municipal supply",
    area: "Chengalpattu Urban (TN_03)",
    date: "Feb 28, 2026",
    status: "Resolved" as const,
    assignee: "Anita Devi (ASHA Worker)",
  },
  {
    id: "RPT-2026-0776",
    type: "Other Issue",
    typeIcon: "⚠️",
    desc: "Open drain near community water source",
    area: "Chengalpattu Urban (TN_03)",
    date: "Feb 20, 2026",
    status: "Submitted" as const,
    assignee: "Under review by system",
  },
];
