import Link from "next/link";
import { InlineMath } from "react-katex";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-24">
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="rounded-full border border-border bg-muted px-4 py-1 text-sm text-muted-foreground">
          מאמן פסיכומטרי מבוסס בינה מלאכותית
        </span>

        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          המאמן הפסיכומטרי האישי שלך
        </h1>

        <p className="max-w-xl text-balance text-lg text-muted-foreground">
          לא עוד בנק שאלות. פסיכומטרי AI לומד איך אתם חושבים, מזהה נקודות חוזק
          וחולשה, ובונה עבורכם תוכנית תרגול אישית — כמותי, מילולי ואנגלית.
        </p>

        <Link href="/practice/quant" className={buttonVariants({ size: "lg" })}>
          התחילו לתרגל
        </Link>
      </div>

      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-start shadow-sm">
        <p className="mb-3 text-sm font-medium text-muted-foreground">
          דוגמה: שאלה כמותית
        </p>
        <p className="mb-4 text-base text-card-foreground">
          מהו הפתרון הכללי של משוואה ריבועית מהצורה{" "}
          <bdi dir="ltr" className="inline-block">
            <InlineMath math="ax^2 + bx + c = 0" />
          </bdi>
          ?
        </p>
        <div dir="ltr" className="rounded-lg bg-muted px-4 py-3 text-start">
          <InlineMath math="x = \dfrac{-b \pm \sqrt{b^2 - 4ac}}{2a}" />
        </div>
      </div>
    </main>
  );
}
