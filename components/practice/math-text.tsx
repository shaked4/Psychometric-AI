import { InlineMath } from "react-katex";

/**
 * Renders text that may contain inline LaTeX segments delimited by `$...$`.
 * Each math segment is wrapped in a <bdi dir="ltr"> so it renders correctly
 * inside an RTL (Hebrew) sentence. A plain `dir="ltr"` span only sets
 * direction, it does not isolate the run — so a trailing neutral character
 * like "?" or ":" right after a formula gets pulled into the LTR run's
 * reordering and visually jumps to the wrong side. <bdi> isolates the
 * embedded run from the surrounding bidi context, which keeps adjacent
 * Hebrew punctuation attached where it logically belongs.
 */
export function MathText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\$[^$]+\$)/g).filter((part) => part.length > 0);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.startsWith("$") && part.endsWith("$") ? (
          <bdi key={index} dir="ltr" className="inline-block px-0.5">
            <InlineMath math={part.slice(1, -1)} />
          </bdi>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
}
