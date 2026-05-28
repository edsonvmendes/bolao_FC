import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

type Tone = "default" | "success" | "warning" | "danger" | "inverse";

const chipTones: Record<Tone, string> = {
  default: "bg-lime-50 text-lime-950 ring-lime-950/10",
  success: "bg-emerald-100 text-emerald-900 ring-emerald-800/15",
  warning: "bg-yellow-300 text-lime-950 ring-yellow-600/20",
  danger: "bg-red-50 text-red-800 ring-red-700/15",
  inverse: "bg-lime-950 text-white ring-white/10",
};

const buttonVariants = {
  primary: "bg-lime-950 text-white hover:bg-lime-900",
  accent: "bg-yellow-300 text-lime-950 hover:bg-yellow-200",
  secondary: "bg-white text-lime-950 hover:bg-lime-50",
  ghost: "bg-white/10 text-white hover:bg-white/15",
};

type ButtonVariant = keyof typeof buttonVariants;

export function Panel({
  children,
  className = "",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <section
      className={`min-w-0 overflow-hidden rounded-lg border-2 border-lime-950/10 bg-white/95 p-4 shadow-sm ${className}`}
    >
      {title && <h2 className="text-lg font-black">{title}</h2>}
      {title ? <div className="mt-3">{children}</div> : children}
    </section>
  );
}

export function StatusChip({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-md px-3 py-1.5 text-xs font-black uppercase ring-1 ${chipTones[tone]}`}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  label,
  detail,
}: {
  value: number;
  label: string;
  detail?: string;
}) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="rounded-md bg-lime-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase text-lime-900/60">{label}</p>
        <p className="text-sm font-black">{safeValue}%</p>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-yellow-400 transition-[width]"
          style={{ width: `${safeValue}%` }}
        />
      </div>
      {detail && (
        <p className="mt-2 text-sm font-bold text-lime-900/70">{detail}</p>
      )}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | string;
  detail?: string;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border-2 border-lime-950/10 bg-white/95 p-4 shadow-sm">
      <p className="text-xs font-black uppercase text-lime-900/60">{label}</p>
      <p className="mt-1 text-3xl font-black leading-none">{value}</p>
      {detail && (
        <p className="mt-2 text-sm font-bold text-lime-900/70">{detail}</p>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Panel className="p-5">
      <h1 className="text-xl font-black">{title}</h1>
      <p className="mt-2 text-sm font-semibold text-lime-900/70">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </Panel>
  );
}

export function AlertMessage({
  children,
  tone = "success",
}: {
  children: React.ReactNode;
  tone?: Extract<Tone, "success" | "danger" | "warning">;
}) {
  const classes = {
    success: "border-lime-700 bg-lime-50 text-lime-800",
    danger: "border-red-300 bg-red-50 text-red-700",
    warning: "border-yellow-500 bg-yellow-50 text-lime-950",
  };

  return (
    <p className={`rounded-lg border-2 p-3 text-sm font-black ${classes[tone]}`}>
      {children}
    </p>
  );
}

export function ActionLink({
  className = "",
  variant = "primary",
  ...props
}: ComponentPropsWithoutRef<typeof Link> & {
  variant?: ButtonVariant;
}) {
  return (
    <Link
      {...props}
      className={`grid h-12 place-items-center rounded-md px-5 text-sm font-black transition-colors ${buttonVariants[variant]} ${className}`}
    />
  );
}

export function SubmitButton({
  children,
  className = "",
  variant = "primary",
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  variant?: ButtonVariant;
}) {
  return (
    <button
      {...props}
      className={`h-11 rounded-md px-4 text-sm font-black transition-colors ${buttonVariants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export const inputClass =
  "h-11 rounded-md border-2 border-lime-950/15 bg-lime-50 px-3 font-semibold outline-none focus:border-yellow-400";
