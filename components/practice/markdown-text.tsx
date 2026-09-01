import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { InlineMath } from "react-katex";

function HeadingSpan({ children }: { children?: ReactNode }) {
  return <strong className="mb-1 mt-2 block text-sm font-semibold first:mt-0">{children}</strong>;
}

const MARKDOWN_COMPONENTS: Components = {
  // react-markdown always wraps loose text in <p>, but this content stays
  // inline rather than a real block — explanations interleave math with
  // prose closely enough (often a formula every clause) that treating every
  // $...$ split as a paragraph break would fragment one sentence into
  // disjointed lines. See MarkdownText's doc comment below.
  p: ({ children }) => <>{children}</>,
  h1: HeadingSpan,
  h2: HeadingSpan,
  h3: HeadingSpan,
  h4: HeadingSpan,
  ul: ({ children }) => <ul className="my-1 list-disc ps-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1 list-decimal ps-5">{children}</ol>,
};

/**
 * Renders free-form AI prose — question explanations, "הסבר בדרך אחרת" /
 * "זיהוי המלכודת" tutor replies — that may mix Markdown formatting
 * (**bold**, ## headings, lists, Claude's default writing style for this
 * kind of prompt) with inline LaTeX math delimited by $...$. Unlike
 * MathText (question body/choices/passage, which the generation prompt
 * keeps to plain text + $...$ only and never asks for markdown), this
 * content is genuinely free-form and used to render "**נכון**" / "## שלב 1"
 * literally as raw asterisks/hashes instead of formatted text.
 *
 * Splits on the same $...$ boundary MathText uses — full remark-math +
 * rehype-katex AST integration would parse math and markdown together more
 * robustly, but react-katex's <InlineMath> already renders this app's math
 * correctly everywhere else (including the <bdi dir="ltr"> bidi-isolation
 * wrapper MathText's own comment explains is needed inside RTL text); this
 * reuses that exact proven path rather than re-implementing math rendering
 * through a second library stack.
 */
export function MarkdownText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\$[^$]+\$)/g).filter((part) => part.length > 0);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.startsWith("$") && part.endsWith("$") ? (
          <bdi key={index} dir="ltr" className="inline-block px-0.5">
            <InlineMath math={part.slice(1, -1)} />
          </bdi>
        ) : (
          <ReactMarkdown key={index} components={MARKDOWN_COMPONENTS}>
            {part}
          </ReactMarkdown>
        )
      )}
    </span>
  );
}
