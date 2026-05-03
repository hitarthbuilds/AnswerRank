import type { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function FormField({
  label,
  hint,
  required = false,
  children,
  className = "",
}: FormFieldProps) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        {label}
        {required ? (
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">
            Required
          </span>
        ) : null}
      </span>
      {children}
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}
