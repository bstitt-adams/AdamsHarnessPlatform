"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adamsFetch, adamsFetchJson } from "@/lib/adams-harness/client-api";

interface AttachmentFile {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
}

/** Lists interview attachments stored as Base64 in Firestore and downloads the originals. */
export function InterviewAttachmentsList({ interviewId }: { interviewId: string }) {
  const [files, setFiles] = useState<AttachmentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adamsFetchJson<{ files: AttachmentFile[] }>(`/api/admin/interviews/${interviewId}/attachments`)
      .then((data) => !cancelled && setFiles(data.files))
      .catch(() => !cancelled && setFiles([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [interviewId]);

  const download = async (file: AttachmentFile) => {
    setDownloading(file.fileId);
    try {
      const response = await adamsFetch(`/api/admin/interviews/${interviewId}/attachments?fileId=${encodeURIComponent(file.fileId)}`);
      if (!response.ok) throw new Error(`Download failed (${response.status})`);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = file.fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-sm font-medium"><Paperclip className="h-4 w-4" /> Submitted attachments</p>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : files.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments stored.</p>
      ) : (
        <div className="space-y-1.5">
          {files.map((file) => (
            <div key={file.fileId} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
              <span className="truncate">{file.fileName}</span>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                <Button variant="ghost" size="sm" onClick={() => void download(file)} disabled={downloading === file.fileId}>
                  {downloading === file.fileId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
