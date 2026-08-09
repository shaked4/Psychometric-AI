interface OverviewHeaderProps {
  totalAnswered: number;
  accuracyPct: number;
  streakDays: number;
}

export function OverviewHeader({ totalAnswered, accuracyPct, streakDays }: OverviewHeaderProps) {
  const stats = [
    { label: "שאלות שנפתרו", value: String(totalAnswered) },
    { label: "דיוק כללי", value: `${accuracyPct}%` },
    { label: "רצף ימי תרגול", value: streakDays > 0 ? `${streakDays} 🔥` : "0" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-border bg-card p-5 text-center shadow-sm"
        >
          <p className="text-3xl font-bold tracking-tight text-card-foreground">{stat.value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
