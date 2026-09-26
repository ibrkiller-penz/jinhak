export const ProgressBar = ({ value }: { value: number }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
    <div
      className={`h-full rounded-full ${value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-400' : 'bg-teal-500'}`}
      style={{ width: `${Math.min(100, value)}%` }}
    />
  </div>
);
