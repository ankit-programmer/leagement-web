import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

/**
 * The ONLY way card content is rendered. rehype-sanitize is load-bearing:
 * cards contain user- and AI-authored markdown, and the auth token lives in
 * localStorage — an unsanitized card is a stored-XSS token theft.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-sm max-w-none text-ink [&_a]:text-brand [&_a]:underline [&_code]:rounded-[4px] [&_code]:bg-surface-subtle [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-bold [&_img]:max-w-full [&_img]:rounded-chip">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
