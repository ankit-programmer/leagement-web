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
    // Tailwind preflight strips ALL element defaults, so every markdown
    // construct must be styled here explicitly — this list is the app's
    // entire markdown "theme". Long-form additions (headings, fenced code,
    // quotes, tables) arrived with problem descriptions/solutions.
    <div className="max-w-none text-ink [&_a]:text-brand [&_a]:underline [&_code]:rounded-[4px] [&_code]:bg-surface-subtle [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-bold [&_img]:max-w-full [&_img]:rounded-chip [&_.katex]:bg-transparent [&_.katex]:p-0 [&_.katex]:font-normal [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-field [&_pre]:bg-surface-subtle [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_h1]:mb-1.5 [&_h1]:mt-3 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:mb-1.5 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-bold [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:font-bold [&_h4]:font-bold [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-hairline-strong [&_blockquote]:pl-3 [&_blockquote]:text-ink-muted [&_hr]:my-3 [&_hr]:border-hairline [&_table]:my-2 [&_table]:block [&_table]:overflow-x-auto [&_th]:border [&_th]:border-hairline [&_th]:px-2 [&_th]:py-1 [&_th]:font-bold [&_td]:border [&_td]:border-hairline [&_td]:px-2 [&_td]:py-1">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeSanitize, schema], rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </div>
  );
});
