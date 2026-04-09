import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
  danger = true,
}: Props) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[200] flex items-center justify-center px-4"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        onMouseDown={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm rounded-sm p-6 space-y-4"
          style={{
            background: "hsl(0 0% 8%)",
            border: `1px solid ${danger ? "hsl(350 85% 30%)" : "hsl(0 0% 20%)"}`,
            boxShadow: danger
              ? "0 0 40px hsl(350 85% 20% / 0.5), 0 8px 32px rgba(0,0,0,0.6)"
              : "0 8px 32px rgba(0,0,0,0.6)",
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div>
            <h3 className="text-sm font-bold text-foreground mb-1">{title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-sm text-xs text-muted-foreground hover:text-foreground transition-colors"
              style={{ border: "1px solid hsl(0 0% 20%)" }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 rounded-sm text-xs font-semibold transition-all hover:brightness-110"
              style={{
                background: danger ? "hsl(350 85% 45%)" : "hsl(0 0% 20%)",
                color: "white",
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default ConfirmDialog;
