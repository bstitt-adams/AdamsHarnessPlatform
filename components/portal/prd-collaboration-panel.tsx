"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bot, Check, Loader2, Network, Send, Sparkles, Trash2, FileInput } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { adamsFetchJson } from "@/lib/adams-harness/client-api";
import { MermaidDiagram } from "@/components/portal/mermaid-diagram";
import type { PrdChatMessage, PrdSystemDiagram } from "@/lib/adams-harness/types";

const QUICK_PROMPTS = [
  "Identify gaps or ambiguous requirements and ask me about them.",
  "Rewrite the requirements so each one is numbered, specific, and testable.",
  "Add acceptance criteria for every functional requirement.",
  "Clarify which existing platform data (Team Members, departments, assets) this module should reuse.",
];

export function PrdCollaborationPanel(props: {
  prdId: string;
  locked: boolean;
  initialChat: PrdChatMessage[];
  initialDiagram: PrdSystemDiagram | null;
  currentContent: string;
  onApplyContent: (content: string) => void;
}) {
  const [chat, setChat] = useState<PrdChatMessage[]>(props.initialChat);
  const [diagram, setDiagram] = useState<PrdSystemDiagram | null>(props.initialDiagram);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [generatingDiagram, setGeneratingDiagram] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChat(props.initialChat);
    setDiagram(props.initialDiagram);
  }, [props.prdId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chat.length, sending]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    setChat((prev) => [...prev, { role: "user", content: message, createdAt: new Date().toISOString() }]);
    setInput("");
    try {
      const data = await adamsFetchJson<{ aiChat: PrdChatMessage[] }>(`/api/admin/interview-prds/${props.prdId}/ai-chat`, {
        method: "POST",
        body: JSON.stringify({ message, currentContent: props.currentContent }),
      });
      setChat(data.aiChat);
    } catch (error) {
      setChat((prev) => prev.slice(0, -1));
      setInput(message);
      toast.error(error instanceof Error ? error.message : "AI chat failed");
    } finally {
      setSending(false);
    }
  };

  const clearChat = async () => {
    try {
      await adamsFetchJson(`/api/admin/interview-prds/${props.prdId}/ai-chat`, { method: "DELETE" });
      setChat([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear chat");
    }
  };

  const generateDiagram = async () => {
    setGeneratingDiagram(true);
    try {
      const data = await adamsFetchJson<{ systemDiagram: PrdSystemDiagram }>(`/api/admin/interview-prds/${props.prdId}/diagram`, {
        method: "POST",
      });
      setDiagram(data.systemDiagram);
      toast.success("System diagram generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Diagram generation failed");
    } finally {
      setGeneratingDiagram(false);
    }
  };

  const insertDiagramIntoPrd = () => {
    if (!diagram) return;
    const section = [
      "## System Diagram",
      "",
      "```mermaid",
      diagram.mermaid,
      "```",
      "",
      diagram.integrationNotes,
      "",
      "### Features & Functions",
      ...diagram.features.flatMap((f) => [`- **${f.name}**`, ...f.functions.map((fn) => `  - ${fn}`)]),
    ].join("\n");
    const stripped = props.currentContent.replace(/\n## System Diagram[\s\S]*?(?=\n## (?!#)|$)/, "").trimEnd();
    props.onApplyContent(`${stripped}\n\n${section}\n`);
    toast.success("Diagram inserted into PRD — click Save Edits to persist");
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI PRD Collaboration</CardTitle>
              <CardDescription>
                Chat with the AI to add requirements or clarify the PRD. Proposed rewrites appear here — apply them to the editor, review, then Save Edits.
              </CardDescription>
            </div>
            {chat.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => void clearChat()} disabled={sending}>
                <Trash2 className="mr-1 h-4 w-4" /> Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-lg border bg-muted/30 p-3">
            {chat.length === 0 && !sending && (
              <p className="py-6 text-center text-sm text-muted-foreground">No conversation yet. Describe what to add or clarify.</p>
            )}
            {chat.map((m, index) => (
              <div key={`${m.createdAt}-${index}`} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                  {m.role === "assistant" && <Bot className="mb-1 h-4 w-4 text-primary" />}
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.proposedContent && (
                    <div className="mt-2 space-y-2 border-t pt-2">
                      {m.changeSummary?.length ? (
                        <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                          {m.changeSummary.map((c) => <li key={c}>{c}</li>)}
                        </ul>
                      ) : null}
                      <Button
                        size="sm"
                        variant={m.proposedContent === props.currentContent ? "secondary" : "default"}
                        disabled={props.locked || m.proposedContent === props.currentContent}
                        onClick={() => {
                          props.onApplyContent(m.proposedContent!);
                          toast.success("Revision applied to editor — click Save Edits to persist");
                        }}
                      >
                        <Check className="mr-1 h-3 w-3" />
                        {m.proposedContent === props.currentContent ? "Applied" : "Apply revision to PRD"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start"><div className="rounded-lg border bg-background px-3 py-2"><Loader2 className="h-4 w-4 animate-spin" /></div></div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={sending || props.locked}
                onClick={() => void send(p)}
                className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={2}
              placeholder={props.locked ? "Deployed PRDs are locked" : "e.g., Add a requirement that supervisors approve requests over $5,000…"}
              disabled={props.locked}
            />
            <Button onClick={() => void send(input)} disabled={sending || props.locked || !input.trim()} className="self-end">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2"><Network className="h-5 w-5 text-primary" /> System Diagram</CardTitle>
              <CardDescription>How this module fits within the Adams Platform — shared services, connected modules, features, and functions.</CardDescription>
            </div>
            <div className="flex gap-2">
              {diagram && (
                <Button variant="outline" size="sm" onClick={insertDiagramIntoPrd} disabled={props.locked}>
                  <FileInput className="mr-1 h-4 w-4" /> Insert into PRD
                </Button>
              )}
              <Button size="sm" onClick={() => void generateDiagram()} disabled={generatingDiagram}>
                {generatingDiagram ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Network className="mr-1 h-4 w-4" />}
                {diagram ? "Regenerate" : "Generate Diagram"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {diagram ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-white p-4"><MermaidDiagram source={diagram.mermaid} /></div>
              <p className="text-sm text-muted-foreground">{diagram.integrationNotes}</p>
              <div className="grid gap-3 md:grid-cols-2">
                {diagram.features.map((f) => (
                  <div key={f.name} className="rounded-lg border p-3">
                    <p className="mb-1 text-sm font-medium">{f.name}</p>
                    <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                      {f.functions.map((fn) => <li key={fn}>{fn}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Generated {new Date(diagram.generatedAt).toLocaleString()}{diagram.generatedByEmail ? ` by ${diagram.generatedByEmail}` : ""}
                {" · "}<Badge variant="outline" className="text-[10px]">Mermaid</Badge>
              </p>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No diagram yet. Generate one from the current PRD.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
