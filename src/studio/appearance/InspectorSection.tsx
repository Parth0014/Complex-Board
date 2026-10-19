import type { ReactNode } from 'react';
export function InspectorSections({
  children,
}: {
  owner: Window;
  kind: string;
  children: ReactNode;
}) {
  return <>{children}</>;
}
export function InspectorSection({
  title,
  children,
  icon,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
  icon?: ReactNode;
}) {
  return (
    <section className="vs-properties-section" aria-label={title}>
      <h3 className="object-inspector-section-heading">
        <span className="object-inspector-section-title">
          {icon && <span aria-hidden="true">{icon}</span>}
          {title}
        </span>
      </h3>
      <div className="vs-properties-section__body">{children}</div>
    </section>
  );
}
