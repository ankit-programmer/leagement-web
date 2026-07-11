import { memo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";

/**
 * The ONLY way card content is rendered. rehype-sanitize is load-bearing:
 * cards contain user- and AI-authored markdown, and the auth token lives in
 * localStorage — an unsanitized card is a stored-XSS token theft.
 *
 * Math: remark-math turns $…$ / $$…$$ into math-classed code nodes, and
 * rehype-katex typesets them. Plugin order is the security boundary —
 * sanitize runs FIRST (math is still plain text at that point), then KaTeX
 * generates its own markup from that text, so its output never carries
 * user-controlled HTML. The schema below only whitelists the class names
 * KaTeX needs to find the math nodes after sanitization.
 * Trade-off: a literal "$5 and $10" on one line reads as math; a lone $
 * stays literal. Fine for flashcards.
 *
 * Memoized: the markdown pipeline is expensive, and card lists render it up
 * to a hundred times per page — it must only re-run when the text changes,
 * never because a parent re-rendered (e.g. search keystrokes).
 */

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ["className", /^language-./, "math-inline", "math-display"]],
  },
} as typeof defaultSchema;

export const Markdown = memo(function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-sm max-w-none text-ink [&_a]:text-brand [&_a]:underline [&_code]:rounded-[4px] [&_code]:bg-surface-subtle [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-bold [&_img]:max-w-full [&_img]:rounded-chip [&_.katex]:bg-transparent [&_.katex]:p-0 [&_.katex]:font-normal">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeSanitize, schema], rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </div>
  );
});
