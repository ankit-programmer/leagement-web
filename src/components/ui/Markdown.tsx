import type { ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { MermaidBlock } from "./MermaidBlock";

// Default GitHub schema, plus className on code so ```mermaid survives
// sanitization (matches the schema's language-* clobber-free pattern).
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ["className", /^language-./]],
  },
} as typeof defaultSchema;

function Code({ className, children, ...props }: ComponentProps<"code">) {
  if (className?.includes("language-mermaid")) {
    return <MermaidBlock code={String(children ?? "")} />;
  }
  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
}

function Pre({ children, ...props }: ComponentProps<"pre">) {
  // Unwrap mermaid blocks from their <pre> so the SVG isn't boxed as code.
  const child = Array.isArray(children) ? children[0] : children;
  if (
    child &&
    typeof child === "object" &&
    "props" in child &&
    typeof (child.props as { className?: string }).className === "string" &&
    (child.props as { className: string }).className.includes("language-mermaid")
  ) {
    return <>{children}</>;
  }
  return <pre {...props}>{children}</pre>;
}

/**
 * The ONLY way card content is rendered. rehype-sanitize is load-bearing:
 * cards contain user- and AI-authored markdown, and the auth token lives in
 * localStorage — an unsanitized card is a stored-XSS token theft. Mermaid
 * blocks route through MermaidBlock (strict mode), never through raw HTML.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-sm max-w-none text-ink [&_a]:text-brand [&_a]:underline [&_code]:rounded-[4px] [&_code]:bg-surface-subtle [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-bold [&_img]:max-w-full [&_img]:rounded-chip">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, schema]]}
        components={{ code: Code, pre: Pre }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
