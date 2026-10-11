export function Skeleton({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="gs-loading" role="status" aria-label={label}>
      <span className="gs-sr-only">{label}</span>
      <div className="gs-skeleton" />
      <div className="gs-skeleton" />
      <div className="gs-skeleton" />
    </div>
  );
}
