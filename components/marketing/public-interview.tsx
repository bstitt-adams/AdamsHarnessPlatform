"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, CheckCircle2, Loader2, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface PublicDepartment {
  index: number;
  id: string;
  name: string;
  code: string;
}

interface PublicInterview {
  id: string;
  status: string;
  messages: ChatMessage[];
  readyForSpecification: boolean;
}

let msgSeq = 0;
const localMessage = (role: "user" | "assistant", content: string): ChatMessage => ({
  id: `local-${++msgSeq}`,
  role,
  content,
  createdAt: new Date().toISOString(),
});

export function PublicInterview() {
  const [departments, setDepartments] = useState<PublicDepartment[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [interview, setInterview] = useState<PublicInterview | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/public/interview")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load departments");
        return res.json() as Promise<{ departments: PublicDepartment[] }>;
      })
      .then(({ departments }) => {
        setDepartments(departments);
        const list = departments.map((d) => `${d.index}. ${d.name}`).join("\n");
        setMessages([
          localMessage(
            "assistant",
            departments.length > 0
              ? `Welcome to the Adams Platform requirements interview. I'll ask questions one at a time to understand the process you'd like to improve.\n\nFirst, which department does this process belong to? Reply with the number:\n\n${list}`
              : "Welcome! No departments are configured yet, so the interview can't begin. Please contact the Adams Electric team.",
          ),
        ]);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async () => {
    const content = input.trim();
    if (!content || sending || departments.length === 0) return;
    setSending(true);
    try {
      if (!interviewId) {
        const choice = parseInt(content, 10);
        const dept = Number.isInteger(choice) ? departments.find((d) => d.index === choice) : undefined;
        setMessages((prev) => [...prev, localMessage("user", content)]);
        setInput("");
        if (!dept) {
          setMessages((prev) => [
            ...prev,
            localMessage(
              "assistant",
              `Please reply with a number between 1 and ${departments.length} to choose the department.`,
            ),
          ]);
          setSending(false);
          return;
        }
        const res = await fetch("/api/public/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ departmentId: dept.id }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : `Failed (${res.status})`);
        setInterviewId(data.interviewId);
        setInterview(data.interview);
        setMessages((prev) => [...prev, ...(data.interview?.messages ?? [])]);
        if (data.interview?.status === "draft") {
          setMessages((prev) => [
            ...prev,
            localMessage(
              "assistant",
              "The interview assistant is not configured right now. Your interview has been saved and the Adams Electric team will follow up.",
            ),
          ]);
        }
      } else {
        const res = await fetch(`/api/public/interview/${interviewId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : `Failed (${res.status})`);
        setInterview(data.interview);
        setMessages(data.interview.messages);
        setInput("");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleUploadAttachment = async (file: File | undefined) => {
    if (!file || !interviewId || uploadingAttachment) return;
    setUploadingAttachment(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (input.trim()) {
        form.append("note", input.trim());
      }
      const res = await fetch(`/api/public/interview/${interviewId}/attachments`, {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : `Failed to analyze attachment (${res.status})`,
        );
      }
      setInterview(data.interview);
      setMessages(data.interview.messages);
      setInput("");
      toast.success(`Analyzed "${file.name}" and added follow-up question`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload attachment");
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const ready = interview?.readyForSpecification === true;
  const inputPlaceholder = interviewId
    ? "Type your answer..."
    : "Reply with the department number...";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bot className="size-5" />
              </div>
              <div>
                <CardTitle>Requirements Interview</CardTitle>
                <CardDescription>
                  {interviewId ? "Answer each question — one at a time." : "Choose a department to begin."}
                </CardDescription>
              </div>
            </div>
            {interview && (
              <Badge variant={ready ? "default" : "secondary"}>
                {interview.status.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[440px] pr-4">
            <div className="space-y-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-4 py-2 text-sm ${
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-muted px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {ready && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium">Requirements captured</p>
                <p className="text-muted-foreground">
                  The interview has everything needed for a specification. The Adams Electric team will review it and follow up.
                </p>
              </div>
            </div>
          )}

          {interviewId && (
            <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Attach spreadsheets or documents (.xlsx, .xls, .csv, .pptx, .docx, .pdf, .md, .txt) for AI analysis
              </span>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.pptx,.ppt,.docx,.doc,.pdf,.md,.txt"
                  className="hidden"
                  onChange={(e) => void handleUploadAttachment(e.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAttachment || sending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingAttachment ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Paperclip className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Attach &amp; Analyze File
                </Button>
              </div>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={inputPlaceholder}
              rows={2}
              className="resize-none"
              disabled={sending || departments.length === 0}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <Button onClick={send} disabled={sending || !input.trim() || departments.length === 0} className="self-end">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            No sign-in required. Your answers are saved as a requirements interview for the Adams Electric team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
