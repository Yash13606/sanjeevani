import { Droplets } from "lucide-react";

const footerLinks = {
  Product: ["Features", "Alerts", "Dashboard", "AI Chat"],
  Resources: ["Docs", "Privacy Policy", "Terms of Use", "Support"],
  Company: ["About", "Team", "Contact", "Blog"],
};

const Footer = () => {
  return (
    <section
      className="relative px-4 sm:px-6 lg:px-10 pt-4 pb-16 overflow-hidden"
      style={{ backgroundColor: "#F2F2F0" }}
    >
      {/* Watermark behind footer */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none select-none z-0">
        <span
          className="font-display font-bold whitespace-nowrap"
          style={{ fontSize: "clamp(120px, 15vw, 220px)", color: "#E5E5E3", lineHeight: 0.85 }}
        >
          Sanjeevani
        </span>
      </div>

      {/* Footer card */}
      <div className="relative z-10 max-w-6xl mx-auto rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="px-6 sm:px-10 lg:px-12 py-10 lg:py-12">
          {/* Top row */}
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
            {/* Logo + tagline */}
            <div className="lg:min-w-[220px] shrink-0">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-display text-lg font-bold text-foreground">
                  Sanjeevani
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#888" }}>
                AI-powered health surveillance for Northeast India.
              </p>
            </div>

            {/* Link columns */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 lg:gap-14 flex-1">
              {Object.entries(footerLinks).map(([title, links]) => (
                <div key={title}>
                  <h4 className="text-sm font-semibold text-foreground mb-4">{title}</h4>
                  <ul className="space-y-2.5">
                    {links.map((link) => (
                      <li key={link}>
                        <a
                          href="#"
                          className="text-sm hover:text-foreground transition-colors duration-200"
                          style={{ color: "#888" }}
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="mt-10 mb-6 border-t" style={{ borderColor: "#EBEBEB" }} />

          {/* Bottom row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm" style={{ color: "#999" }}>
              © 2026 Sanjeevani. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm hover:text-foreground transition-colors" style={{ color: "#999" }}>
                Terms of Service
              </a>
              <a href="#" className="text-sm hover:text-foreground transition-colors" style={{ color: "#999" }}>
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Footer;
