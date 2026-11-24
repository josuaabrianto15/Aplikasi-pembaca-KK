import React from "react";

type Variant = "error" | "success" | "warning" | "info";

const styles: Record<Variant, string> = {
  error: "bg-red-50 border-red-400 text-red-800",
  success: "bg-green-50 border-green-400 text-green-800",
  warning: "bg-yellow-50 border-yellow-400 text-yellow-800",
  info: "bg-blue-50 border-blue-400 text-blue-800",
};

const icons: Record<Variant, string> = {
  error: "✕",
  success: "✓",
  warning: "⚠",
  info: "ℹ",
};

interface AlertProps {
  variant?: Variant;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
}

export default function Alert({
  variant = "info",
  title,
  children,
  onClose,
}: AlertProps) {
  return (
    <div className={`border rounded-lg px-4 py-3 flex gap-3 items-start ${styles[variant]}`}>
      <span className="mt-0.5 font-bold text-sm">{icons[variant]}</span>
      <div className="flex-1 text-sm">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        {children}
      </div>
      {onClose && (
        <button onClick={onClose} className="text-sm opacity-60 hover:opacity-100 ml-2">
          ✕
        </button>
      )}
    </div>
  );
}
