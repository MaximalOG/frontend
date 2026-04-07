import { motion } from "framer-motion";
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

const SupportSection = () => {
  return (
    <section className="pt-20 pb-0 relative">
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">
            Need <span className="text-primary">Help</span>?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Our team is available 24/7 on Discord and email. Or check out our FAQ below.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <a
              href="https://discord.gg/Xa9Pv7nZWX"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 px-6 bg-secondary text-secondary-foreground font-medium text-sm items-center rounded-sm portal-glow hover:brightness-110 transition-all"
            >
              Join our Discord
            </a>
            <a
              href="mailto:supportnethernodes@gmail.com"
              className="inline-flex h-10 px-6 font-medium text-sm items-center rounded-sm transition-all hover:brightness-110"
              style={{ background: "hsl(0 0% 10%)", color: "hsl(0 0% 75%)", border: "1px solid hsl(0 0% 20%)" }}
            >
              supportnethernodes@gmail.com
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6, ease }}
          className="max-w-2xl mx-auto"
        >
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
