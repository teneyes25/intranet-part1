interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
}

export function PageHeader({ title, description, eyebrow }: PageHeaderProps) {
  return (
    <div className="mb-8 space-y-1">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-light">
          {eyebrow}
        </p>
      )}
      <h2 className="text-2xl font-bold tracking-tight text-navy-900 md:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="max-w-2xl text-sm leading-relaxed text-slate-custom-600 md:text-base">
          {description}
        </p>
      )}
    </div>
  );
}
