"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FileUp, Loader2, CheckCircle, Presentation } from "lucide-react";

interface ImportResult {
  courseId: string;
  title: string;
  modules: number;
  lessons: number;
  quizzes: number;
  slidesProcessed: number;
}

export function PptxImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [questionsPerModule, setQuestionsPerModule] = useState("4");
  const [examQuestions, setExamQuestions] = useState("10");
  const [passingScore, setPassingScore] = useState("70");
  const [includeExam, setIncludeExam] = useState(true);
  const [isFree, setIsFree] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => {
    setFile(null); setTitle(""); setResult(null); setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Choose a .pptx file first");
      return;
    }
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (title.trim()) form.append("title", title.trim());
      form.append("questionsPerModule", questionsPerModule);
      form.append("examQuestions", examQuestions);
      form.append("passingScore", passingScore);
      form.append("includeExam", String(includeExam));
      form.append("isFree", String(isFree));

      const res = await fetch("/api/admin/academy/import-pptx", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Import failed (${res.status})`);
      setResult(data as ImportResult);
      toast.success("Course imported — review the draft before publishing");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Presentation className="h-5 w-5 text-orange-500" />
            Import PowerPoint as Course
          </DialogTitle>
          <DialogDescription>
            Slides are converted into modules and lessons, with a quiz per module and an optional final exam. The course is created as an unpublished draft.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-green-50 dark:bg-green-950/30">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">{result.title}</p>
                <p className="text-muted-foreground mt-1">
                  {result.slidesProcessed} slides → {result.modules} modules, {result.lessons} lessons, {result.quizzes} quizzes
                </p>
              </div>
            </div>
            <Button className="w-full" asChild>
              <Link href={`/portal/admin/academy/courses/${result.courseId}/content`}>
                Review &amp; Edit Course Content
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pptx-file">PowerPoint File *</Label>
              <Input
                id="pptx-file"
                ref={fileRef}
                type="file"
                accept=".pptx"
                disabled={importing}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">.pptx only, up to 25MB. Slide text and speaker notes are used — images are not imported.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pptx-title">Course Title (optional)</Label>
              <Input
                id="pptx-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Leave blank to infer from the deck"
                disabled={importing}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quiz questions / module</Label>
                <Select value={questionsPerModule} onValueChange={setQuestionsPerModule} disabled={importing}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["3", "4", "5", "6", "8"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Passing score</Label>
                <Select value={passingScore} onValueChange={setPassingScore} disabled={importing}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["60", "70", "80", "90"].map((n) => <SelectItem key={n} value={n}>{n}%</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="include-exam" className="cursor-pointer">Include final exam ({examQuestions} questions)</Label>
                <div className="flex items-center gap-2">
                  <Select value={examQuestions} onValueChange={setExamQuestions} disabled={importing || !includeExam}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["8", "10", "12", "15", "20"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Switch id="include-exam" checked={includeExam} onCheckedChange={setIncludeExam} disabled={importing} />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="is-free" className="cursor-pointer">Free course</Label>
                <Switch id="is-free" checked={isFree} onCheckedChange={setIsFree} disabled={importing} />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {!result && (
            <Button onClick={handleImport} disabled={importing || !file} className="w-full">
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing — this can take a minute…
                </>
              ) : (
                <>
                  <FileUp className="mr-2 h-4 w-4" />
                  Import &amp; Generate Course
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
