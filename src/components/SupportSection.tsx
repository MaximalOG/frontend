import { motion } from "framer-motion";
import { Mail, ExternalLink } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How do I create a server?",
    a: "Simply pick a plan, enter your server name, and we'll have it running in under 60 seconds. No technical setup required — everything is handled automatically.",
  },
  {
    q: "How do I install plugins?",
    a: "Use our one-click plugin installer in the control panel. Search for any plugin, click install, and it's live on your server instantly.",
  },
  {
    q: "How do I upgrade my plan?",
    a: "Go to your dashboard, click on your current plan, and choose an upgrade. Your server will scale instantly with zero downtime.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes, we offer a 48-hour money-back guarantee on all plans. No questions asked.",
  },
  {
    q: "What Minecraft versions do you support?",
    a: "We support all major versions including Java Edition and Bedrock. You can switch versions anytime from your control panel.",
  },
];

const ease = [0.16, 1, 0.3, 1] as const;

// Inline Discord SVG logo
const DiscordIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const SupportSection = () => {
  return (
    <section className="pt-20 pb-0 relative">
      <div className="container mx-auto px-4 relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">
            Need <span className="text-primary">Help</span>?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Reach us on Discord for instant help, or drop us an email. We also have an AI assistant in the bottom-right corner.
          </p>
        </motion.div>

        {/* Contact cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.5, ease }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-14"
        >
          {/* Discord card */}
          <a
            href="https://discord.gg/Xa9Pv7nZWX"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col items-start gap-4 rounded-sm p-6 transition-all duration-300"
            style={{
              background: "hsl(235 60% 10%)",
              border: "1px solid hsl(235 60% 22%)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 32px hsl(235 85% 55% / 0.35)";
              (e.currentTarget as HTMLElement).style.borderColor = "hsl(235 85% 45%)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
              (e.currentTarget as HTMLElement).style.borderColor = "hsl(235 60% 22%)";
            }}
          >
            {/* Icon */}
            <div
              className="w-12 h-12 rounded-sm flex items-center justify-center"
              style={{ background: "hsl(235 85% 55% / 0.15)", border: "1px solid hsl(235 85% 45% / 0.4)" }}
            >
              <DiscordIcon size={22} />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold text-white">Discord Community</p>
                <ExternalLink size={11} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Get instant help from our team and community. Fastest response time.
              </p>
            </div>

            <div
              className="w-full flex items-center justify-center gap-2 h-9 rounded-sm text-xs font-semibold transition-all group-hover:brightness-110"
              style={{ background: "hsl(235 85% 55%)", color: "white" }}
            >
              <DiscordIcon size={14} />
              Join Discord
            </div>
          </a>

          {/* Email card */}
          <a
            href="mailto:supportnethernodes@gmail.com"
            className="group relative flex flex-col items-start gap-4 rounded-sm p-6 transition-all duration-300"
            style={{
              background: "hsl(350 85% 8%)",
              border: "1px solid hsl(350 85% 20%)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 32px hsl(350 85% 45% / 0.3)";
              (e.currentTarget as HTMLElement).style.borderColor = "hsl(350 85% 40%)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
              (e.currentTarget as HTMLElement).style.borderColor = "hsl(350 85% 20%)";
            }}
          >
            {/* Icon */}
            <div
              className="w-12 h-12 rounded-sm flex items-center justify-center"
              style={{ background: "hsl(350 85% 15% / 0.5)", border: "1px solid hsl(350 85% 30% / 0.5)" }}
            >
              <Mail size={22} className="text-primary" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold text-white">Email Support</p>
                <ExternalLink size={11} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                For billing, invoices, or detailed issues. We reply within 24 hours.
              </p>
            </div>

            <div
              className="w-full flex flex-col items-center justify-center h-9 rounded-sm text-xs font-semibold transition-all group-hover:brightness-110"
              style={{ background: "hsl(350 85% 45%)", color: "white" }}
            >
              supportnethernodes@gmail.com
            </div>
          </a>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6, ease }}
          className="max-w-2xl mx-auto"
        >
          <p className="text-xs text-muted-foreground/50 mono uppercase tracking-widest text-center mb-5">
            Frequently Asked Questions
          </p>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="glass-surface rounded-sm px-4 border-none"
              >
                <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

      </div>
    </section>
  );
};

export default SupportSection;
