"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection, query, orderBy, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  doc, Timestamp, serverTimestamp,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Upload, Download, Trash2, Pencil, Loader2, File as FileIcon,
} from "lucide-react";
import { toast } from "sonner";

// Firestore docs cap at ~1 MiB; base64 inflates ~33%, so cap raw uploads here.
const MAX_FILE_BYTES = 700 * 1024;

interface ProjectFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: Date | null;
}

const fmtSize = (n: number) =>
  n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

export function ProjectFiles({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filesCol = () => collection(db!, COLLECTIONS.PROJECTS, projectId, "files");

  const refresh = async () => {
    if (!db) return;
    const snap = await getDocs(query(filesCol(), orderBy("createdAt", "desc")));
    setFiles(snap.docs.map((d) => {
      const f = d.data();
      return {
        id: d.id, name: f.name || "file", mimeType: f.mimeType || "application/octet-stream",
        size: f.size || 0,
        createdAt: f.createdAt instanceof Timestamp ? f.createdAt.toDate() : null,
      };
    }));
  };

  useEffect(() => {
    refresh().catch(() => toast.error("Failed to load files")).finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleUpload = async (list: FileList | null) => {
    if (!db || !list?.length) return;
    const file = list[0];
    if (file.size > MAX_FILE_BYTES) {
      toast.error(`"${file.name}" is ${fmtSize(file.size)} — files over ${fmtSize(MAX_FILE_BYTES)} can't be stored in the database`);
      return;
    }
    setIsUploading(true);
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1] || "");
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      const ref = await addDoc(filesCol(), {
        name: file.name, mimeType: file.type || "application/octet-stream",
        size: file.size, dataBase64,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setFiles((p) => [{ id: ref.id, name: file.name, mimeType: file.type || "", size: file.size, createdAt: new Date() }, ...p]);
      toast.success(`Uploaded ${file.name}`);
    } catch {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDownload = async (f: ProjectFile) => {
    if (!db) return;
    setBusyId(f.id);
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.PROJECTS, projectId, "files", f.id));
      const data = snap.data()?.dataBase64 as string;
      if (!data) throw new Error("empty");
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: f.mimeType }));
      const a = document.createElement("a");
      a.href = url; a.download = f.name; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleRename = async (f: ProjectFile) => {
    const name = window.prompt("Rename file", f.name)?.trim();
    if (!db || !name || name === f.name) return;
    setFiles((p) => p.map((x) => (x.id === f.id ? { ...x, name } : x)));
    try {
      await updateDoc(doc(db, COLLECTIONS.PROJECTS, projectId, "files", f.id), { name, updatedAt: serverTimestamp() });
    } catch {
      toast.error("Rename failed");
      refresh();
    }
  };

  const handleDelete = async (f: ProjectFile) => {
    if (!db || !window.confirm(`Delete "${f.name}"?`)) return;
    setBusyId(f.id);
    try {
      await deleteDoc(doc(db, COLLECTIONS.PROJECTS, projectId, "files", f.id));
      setFiles((p) => p.filter((x) => x.id !== f.id));
      toast.success("File deleted");
    } catch {
      toast.error("Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Attachments stored in the project record (Base64, up to {fmtSize(MAX_FILE_BYTES)} each)
        </p>
        <Button size="sm" variant="outline" disabled={isUploading} onClick={() => inputRef.current?.click()}>
          {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          Upload File
        </Button>
        <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleUpload(e.target.files)} />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : files.length === 0 ? (
        <p className="text-muted-foreground italic text-center py-4">No files uploaded yet</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 p-3">
              <FileIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtSize(f.size)}{f.createdAt ? ` · ${f.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
                </p>
              </div>
              <Badge variant="outline" className="hidden sm:inline max-w-32 truncate">{f.mimeType}</Badge>
              {busyId === f.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <div className="flex items-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Download" onClick={() => handleDownload(f)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Rename" onClick={() => handleRename(f)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete" onClick={() => handleDelete(f)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
