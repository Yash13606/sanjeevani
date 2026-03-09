import { motion } from "framer-motion";
import { Shield, Lock, Zap, Users, RefreshCw, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Lock,
    title: "Privacy First",
    desc: "All citizen health data encrypted at rest and in transit with SOC-2 level security practices.",
  },
  {
    icon: Shield,
    title: "Strong Security Guarantees",
    desc: "JWT authentication, bcrypt passwords, rate limiting, and role-based access control.",
  },
  {
    icon: Zap,
    title: "Hallucination-Free AI",
    desc: "Random Forest model with explainable predictions — no black-box hallucinations.",
  },
  {
    icon: Users,
    title: "Multiple Roles & Personas",
    desc: "Citizen, ASHA Worker, and Hospital role-based dashboards with tailored experiences.",
  },
  {
    icon: RefreshCw,
    title: "Interoperable AI Providers",
    desc: "Works with Dialogflow, Rasa, or custom chatbot engines for flexibility.",
  },
  {
    icon: BarChart3,
    title: "Insights & Analytics",
    desc: "District-level outbreak trend dashboards with exportable data and reports.",
  },
];

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const TrustSection = () => {
  return (
    <section id="trust" className="py-20" style={{ backgroundColor: "hsl(60, 20%, 98%)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-bold text-foreground mb-4 leading-tight">
            A platform your health department can trust
          </h2>
          <p className="text-lg text-muted-foreground">
            Government-grade security, data sovereignty, and compliance — built
            for institutional healthcare deployment.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={cardVariant}
              whileHover={{
                y: -6,
                boxShadow: "0 20px 40px -12px rgba(0,0,0,0.1)",
                borderColor: "hsl(156, 61%, 26%, 0.3)",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="group p-6 rounded-2xl bg-card border border-border transition-all duration-300"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors"
              >
                <f.icon className="w-6 h-6 text-primary" />
              </motion.div>
              <h3 className="font-display text-lg font-bold text-foreground mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default TrustSection;
