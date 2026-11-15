"use client";

import { useEffect, useId, useState } from "react";

/** Renders Mermaid source to SVG client-side. securityLevel "strict" sanitizes labels and disables click handlers. */
export function MermaidDiagram({ source }: { source: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
        const { svg: rendered } = await mermaid.render(`mmd${id}${Date.now()}`, source);
        if (!cancelled) {
          setSvg(rendered);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to render diagram");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, source]);

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">Diagram could not be rendered: {error}</p>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{source}</pre>
      </div>
    );
  }
  return <div className="overflow-x-auto [&_svg]:mx-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}
