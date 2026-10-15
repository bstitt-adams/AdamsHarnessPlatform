"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send } from "lucide-react";
import { adamsFetchJson } from "@/lib/adams-harness/client-api";
import { useUserProfile } from "@/contexts/user-profile-context";

type Brain = {
  id: string;
  name: string;
  description: string;
  audience: string;
};

type Citation = {
  id: string;
  sourceId: string;
  chunkId: string;
  title: string;
  version: number;
  excerpt: string;
};

type Turn = {
  id: string;
  question: string;
  answer: string;
  citations: Citation[];
  insufficientEvidence: boolean;
};

export default function AdamsBrainPage() {
  const { isLoading, isAuthenticated } = useUserProfile();
  const [brains, setBrains] = useState<Brain[]>([]);
  const [brainId, setBrainId] = useState<string>("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    let cancelled = false;
    adamsFetchJson<{ brains: Brain[] }>("/api/adams-harness/brains")
      .then((data) => {
        if (cancelled) return;
        setBrains(data.brains);
        setBrainId((prev) => prev || data.brains[0]?.id || "");
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load brains.");
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoading, isAuthenticated]);

  const ask = async () => {
    const q = question.trim();
    if (!q || !brainId) return;
    setAsking(true);
    setError(null);
    try {
      const result = await adamsFetchJson<{
        id: string;
        answer: string;
        citations: Citation[];
        insufficientEvidence: boolean;
      }>(
        `/api/adams-harness/brains/${encodeURIComponent(brainId)}/query`,
        { method: "POST", body: JSON.stringify({ question: q }) },
      );
      setTurns((prev) => [
        ...prev,
        {
          id: result.id,
          question: q,
          answer: result.answer,
          citations: result.citations,
          insufficientEvidence: result.insufficientEvidence,
        },
      ]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setAsking(false);
    }
  };

  if (isLoading || (isAuthenticated && fetching)) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Please sign in to use AdamsBrain.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AdamsBrain</h1>
          <p className="text-muted-foreground">
            Ask questions grounded in your department&apos;s approved knowledge.
          </p>
        </div>
        {brains.length > 0 && (
          <Select value={brainId} onValueChange={setBrainId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a brain" />
            </SelectTrigger>
            <SelectContent>
              {brains.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {brains.length === 0 && !error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              No AdamsBrain is available to you yet.
            </p>
          </CardContent>
        </Card>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-4">
        {turns.map((turn) => (
          <Card key={turn.id}>
            <CardHeader>
              <CardTitle className="text-base">{turn.question}</CardTitle>
              {turn.insufficientEvidence && (
                <Badge variant="outline">Insufficient evidence</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="whitespace-pre-wrap text-sm">{turn.answer}</p>
              {turn.citations.length > 0 && (
                <div className="grid gap-2 md:grid-cols-2">
                  {turn.citations.map((c) => (
                    <Card key={c.id} className="border-dashed">
                      <CardHeader className="p-3">
                        <CardTitle className="text-xs font-medium">
                          {c.title} <Badge variant="outline">v{c.version}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {c.excerpt}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {brainId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ask a question</CardTitle>
            <CardDescription>
              Answers cite only approved brain sources.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={question}
              maxLength={4000}
              placeholder="Type your question..."
              onChange={(e) => setQuestion(e.target.value)}
            />
            <Button
              onClick={() => void ask()}
              disabled={asking || !question.trim()}
            >
              {asking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" /> Ask
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
