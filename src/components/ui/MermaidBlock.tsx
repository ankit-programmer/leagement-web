"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

let renderCounter = 0;

/**
 * Renders a Mermaid code block as SVG. The library (~500KB) loads lazily on
 * first use so cards without diagrams never pay for it. securityLevel:strict
 * makes mermaid sanitize label content; the server additionally rejects
 * click/init/script directives at generation time. A render failure shows the
 * source instead of breaking the card.
 */
export function MermaidBlock({ code }: { code: string }) {
  const { resolvedTheme } = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setFailed(false);
    import("mermaid").then(async ({ default: mermaid }) => {
      if (cancelled) return;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: resolvedTheme === "dark" ? "dark" : "neutral",
        fontFamily: "inherit",
      });
      try {
        renderCounter += 1;
        const { svg: rendered } = await mermaid.render(`leagement-mmd-${renderCounter}`, code);
        if (!cancelled) setSvg(rendered);
      } catch {
        if (!cancelled) setFailed(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [code, resolvedTheme]);

  if (failed) {
    return (
      <div className="my-2 rounded-chip border border-warning/40 bg-warning-bg px-3 py-2">
        <p className="text-xs font-semibold text-warning-ink">Diagram failed to render — source:</p>
        <pre className="mt-1 overflow-x-auto font-mono text-xs text-warning-ink/90">{code}</pre>
      </div>
    );
  }
  if (!svg) return <div className="my-2 h-24 animate-pulse rounded-chip bg-skeleton" />;
  return (
    <div
      className="my-2 overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-full"
      // Mermaid's own strict-mode output — the only HTML injected outside
      // the rehype-sanitize pipeline, by design.
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
