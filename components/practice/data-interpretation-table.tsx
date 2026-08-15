import type { DiagramData } from "@/types";

interface DataInterpretationTableProps {
  diagram: DiagramData;
}

/**
 * Renders a "data interpretation" (הסקת מתרשים) block's shared dataset as a
 * real HTML table from structured JSON (DiagramData) rather than an image or
 * raw HTML string — same reasoning as the rest of this app's stats layer:
 * deterministic structured data in, no dangerouslySetInnerHTML, no risk of
 * an unreadable rasterized chart. One diagram is shared by every question in
 * its group (see Question.groupId in types/index.ts) — each question row
 * carries its own copy so this component stays self-contained.
 */
export function DataInterpretationTable({ diagram }: DataInterpretationTableProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4">
      <p className="text-sm font-semibold text-card-foreground">{diagram.title}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-border p-2 text-start font-medium text-muted-foreground" />
              {diagram.columns.map((col) => (
                <th key={col} className="border-b border-border p-2 text-start font-medium text-muted-foreground">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {diagram.rows.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="border-b border-border p-2 text-start font-medium text-card-foreground">
                  {row.label}
                </th>
                {row.values.map((value, i) => (
                  <td key={i} className="border-b border-border p-2 text-start text-card-foreground">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {diagram.legend && <p className="text-xs leading-relaxed text-muted-foreground">{diagram.legend}</p>}
    </div>
  );
}
