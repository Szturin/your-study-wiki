import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  className?: string;
  children: ReactNode;
};

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function SectionCard({
  title,
  eyebrow,
  description,
  className,
  children,
}: SectionCardProps) {
  return (
    <section
      className={joinClassNames(
        "rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.25)] backdrop-blur",
        className,
      )}
    >
      <div className="mb-4 flex flex-col gap-2">
        {eyebrow ? (
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            {eyebrow}
          </span>
        ) : null}
        <h2 className="text-lg font-semibold text-slate-50">{title}</h2>
        {description ? (
          <p className="text-sm leading-6 text-slate-300">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
