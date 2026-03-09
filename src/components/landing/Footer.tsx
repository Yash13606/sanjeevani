import { Droplets } from "lucide-react";

const footerLinks = {
  Product: ["Features", "Alerts", "Dashboard", "AI Chat"],
  Resources: ["Docs", "API", "Privacy Policy"],
  Company: ["About", "Team", "Contact"],
  Support: ["Help Center", "Status", "Terms"],
};

const Footer = () => {
  return (
    <footer style={{ backgroundColor: "hsl(105, 11%, 7%)" }} className="border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Top row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Logo */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <Droplets className="w-4 h-4 text-accent-foreground" />
              </div>
              <span className="font-display text-lg font-bold text-white">
                Sanjeevani
              </span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed">
              AI-powered community health surveillance for Northeast India.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-white mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-white/50 hover:text-accent transition-colors duration-200"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/10">
          <p className="text-sm text-white/40 text-center">
            © 2026 Sanjeevani. Built for Northeast India's communities.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
