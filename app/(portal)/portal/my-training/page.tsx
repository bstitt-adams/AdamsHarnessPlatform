"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { COLLECTIONS, type UserTrainingCertDoc } from "@/lib/schema";
import { useUserProfile } from "@/contexts/user-profile-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GraduationCap,
  Award,
  BookOpen,
  Loader2,
  ExternalLink,
  Upload,
  Download,
  Eye,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from "lucide-react";

interface UserEnrollmentRow {
  id: string;
  courseId: string;
  courseTitle: string;
  progressPercentage: number;
  enrolledAt?: string;
  completedAt?: string;
}

interface UserCertificateRow {
  id: string;
  certificateNumber: string;
  courseTitle: string;
  studentName: string;
  issuedAt?: string;
}

const TRAINING_CATEGORIES = [
  "OSHA / Safety Compliance",
  "NFPA 70E / Electrical Safety",
  "Equipment / Lift / Forklift",
  "First Aid / CPR / AED",
  "BIM / Preconstruction / Technical",
  "Field Leadership / Supervision",
  "State / Trade License",
  "Other",
];

const MAX_ARTIFACT_BYTES = 700 * 1024; // ~700 KB raw file (~933 KB Base64, safely within Firestore's 1 MB document limit)

function getExpirationStatus(expirationDate: string): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  isExpired: boolean;
  isExpiringSoon: boolean;
} {
  if (!expirationDate) {
    return {
      label: "No Expiration",
      variant: "secondary",
      isExpired: false,
      isExpiringSoon: false,
    };
  }
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expirationDate);
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return {
      label: `Expired (${Math.abs(diffDays)}d ago)`,
      variant: "destructive",
      isExpired: true,
      isExpiringSoon: false,
    };
  }
  if (diffDays <= 30) {
    return {
      label: `Expires in ${diffDays}d`,
      variant: "outline",
      isExpired: false,
      isExpiringSoon: true,
    };
  }
  return {
    label: "Active",
    variant: "default",
    isExpired: false,
    isExpiringSoon: false,
  };
}

export default function MyTrainingAndCertsPage() {
  const { linkedTeamMember, profile, isMasqueradingUser } = useUserProfile();
  const [enrollments, setEnrollments] = useState<UserEnrollmentRow[]>([]);
  const [certificates, setCertificates] = useState<UserCertificateRow[]>([]);
  const [uploadedCerts, setUploadedCerts] = useState<UserTrainingCertDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload Training / Cert Dialog State
  const [uploadOpen, setUploadOpen] = useState(false);
  const [savingUpload, setSavingUpload] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<UserTrainingCertDoc | null>(null);
  const [formData, setFormData] = useState({
    trainingTitle: "",
    trainingCategory: "OSHA / Safety Compliance",
    issuingOrganization: "",
    credentialId: "",
    completionDate: new Date().toISOString().split("T")[0],
    expirationDate: "",
    trainingHours: "",
    notes: "",
    artifactFileName: "",
    artifactMimeType: "",
    artifactSize: 0,
    artifactBase64: "",
  });

  const viewedName = linkedTeamMember
    ? `${linkedTeamMember.firstName} ${linkedTeamMember.lastName}`.trim()
    : profile.firstName
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : profile.email || "Current User";

  const targetUid = linkedTeamMember?.firebaseUid || auth?.currentUser?.uid || "";
  const targetMemberId = linkedTeamMember?.id || "";
  const targetEmail = (linkedTeamMember?.emailPrimary || profile.email || "").toLowerCase();

  const loadTraining = useCallback(async () => {
    if (!db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const candidateIds = Array.from(
        new Set([targetUid, targetMemberId].filter(Boolean))
      );

      const [coursesSnap, uploadedSnap] = await Promise.all([
        getDocs(collection(db, "lms_courses")).catch(() => null),
        getDocs(collection(db, COLLECTIONS.USER_TRAINING_CERTS)).catch(() => null),
      ]);

      const courseMap = new Map<string, string>();
      coursesSnap?.forEach((d) => {
        const data = d.data();
        courseMap.set(d.id, String(data.title || d.id));
      });

      const userUploads: UserTrainingCertDoc[] = [];
      uploadedSnap?.forEach((d) => {
        const data = { id: d.id, ...d.data() } as UserTrainingCertDoc;
        if (targetMemberId && data.teamMemberId === targetMemberId) {
          userUploads.push(data);
        } else if (targetUid && data.userId === targetUid) {
          userUploads.push(data);
        } else if (targetEmail && (data.userEmail || "").toLowerCase() === targetEmail) {
          userUploads.push(data);
        }
      });
      userUploads.sort((a, b) =>
        (a.expirationDate || "").localeCompare(b.expirationDate || "")
      );
      setUploadedCerts(userUploads);

      const enrollRows: UserEnrollmentRow[] = [];
      const certRows: UserCertificateRow[] = [];

      if (candidateIds.length > 0) {
        const [enrollSnap, certSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "lms_enrollments"),
              where("userId", "in", candidateIds)
            )
          ).catch(() => null),
          getDocs(
            query(
              collection(db, "lms_certificates"),
              where("userId", "in", candidateIds)
            )
          ).catch(() => null),
        ]);

        enrollSnap?.forEach((d) => {
          const data = d.data();
          const courseId = String(data.courseId || "");
          enrollRows.push({
            id: d.id,
            courseId,
            courseTitle:
              courseMap.get(courseId) || String(data.courseTitle || courseId),
            progressPercentage: Number(data.progressPercentage ?? 0),
            enrolledAt: data.enrolledAt?.toDate
              ? data.enrolledAt.toDate().toLocaleDateString()
              : undefined,
            completedAt: data.completedAt?.toDate
              ? data.completedAt.toDate().toLocaleDateString()
              : undefined,
          });
        });

        certSnap?.forEach((d) => {
          const data = d.data();
          certRows.push({
            id: d.id,
            certificateNumber: String(data.certificateNumber || d.id),
            courseTitle: String(
              data.courseTitle || courseMap.get(String(data.courseId)) || "Course"
            ),
            studentName: String(data.studentName || viewedName),
            issuedAt: data.issuedAt?.toDate
              ? data.issuedAt.toDate().toLocaleDateString()
              : undefined,
          });
        });
      }

      setEnrollments(enrollRows);
      setCertificates(certRows);
    } catch (err) {
      console.error("Failed to load training & certs:", err);
      toast.error("Failed to load training records");
    } finally {
      setLoading(false);
    }
  }, [targetUid, targetMemberId, targetEmail, viewedName]);

  useEffect(() => {
    void loadTraining();
  }, [loadTraining]);

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_ARTIFACT_BYTES) {
      toast.error(
        "File is too large for Base64 Firestore storage. Please upload a file under 700 KB (PDF, PNG, JPG)."
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setFormData((prev) => ({
        ...prev,
        artifactFileName: file.name,
        artifactMimeType: file.type || "application/octet-stream",
        artifactSize: file.size,
        artifactBase64: result,
      }));
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTrainingCert = async () => {
    if (!db) return;
    if (!formData.trainingTitle.trim()) {
      toast.error("Training / Certification Title is required");
      return;
    }
    if (!formData.issuingOrganization.trim()) {
      toast.error("Issuing Organization / Provider is required");
      return;
    }
    if (!formData.expirationDate.trim()) {
      toast.error("Training Expiration Date is required");
      return;
    }
    if (!formData.artifactBase64) {
      toast.error("Please attach your training/certification artifact file");
      return;
    }

    setSavingUpload(true);
    try {
      const hours = formData.trainingHours
        ? Number(formData.trainingHours)
        : undefined;

      const certDocRef = await addDoc(collection(db, COLLECTIONS.USER_TRAINING_CERTS), {
        userId: targetUid || targetMemberId,
        teamMemberId: targetMemberId || targetUid,
        userName: viewedName,
        userEmail: targetEmail,
        trainingTitle: formData.trainingTitle.trim(),
        trainingCategory: formData.trainingCategory,
        issuingOrganization: formData.issuingOrganization.trim(),
        credentialId: formData.credentialId.trim(),
        completionDate: formData.completionDate,
        expirationDate: formData.expirationDate,
        ...(hours !== undefined && Number.isFinite(hours)
          ? { trainingHours: hours }
          : {}),
        notes: formData.notes.trim(),
        artifactFileName: formData.artifactFileName,
        artifactMimeType: formData.artifactMimeType,
        artifactSize: formData.artifactSize,
        artifactBase64: formData.artifactBase64,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Automatically sync training completion & expiration dates to the Adams Master Calendar
      try {
        const parseLocalDate = (ymd: string, hour: number) => {
          const [y, m, d] = ymd.split("-").map(Number);
          return new Date(y, (m || 1) - 1, d || 1, hour, 0, 0, 0);
        };

        if (formData.completionDate) {
          const compStart = parseLocalDate(formData.completionDate, 9);
          const compEnd = parseLocalDate(formData.completionDate, 10);
          await addDoc(collection(db, COLLECTIONS.CALENDAR_EVENTS), {
            title: `Training: ${formData.trainingTitle.trim()} (${viewedName})`,
            description: `${formData.trainingCategory} · Issued by ${formData.issuingOrganization.trim()}${
              formData.credentialId.trim() ? ` · ID: ${formData.credentialId.trim()}` : ""
            }`,
            startDate: Timestamp.fromDate(compStart),
            endDate: Timestamp.fromDate(compEnd),
            allDay: true,
            type: "training",
            color: "#0ea5e9",
            attendees: [viewedName],
            location: formData.issuingOrganization.trim(),
            trainingCertId: certDocRef.id,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        }

        if (formData.expirationDate) {
          const expStart = parseLocalDate(formData.expirationDate, 9);
          const expEnd = parseLocalDate(formData.expirationDate, 10);
          await addDoc(collection(db, COLLECTIONS.CALENDAR_EVENTS), {
            title: `Cert Expires: ${formData.trainingTitle.trim()} (${viewedName})`,
            description: `Renewal required for ${formData.trainingTitle.trim()} · Issued by ${formData.issuingOrganization.trim()}`,
            startDate: Timestamp.fromDate(expStart),
            endDate: Timestamp.fromDate(expEnd),
            allDay: true,
            type: "training",
            color: "#f59e0b",
            attendees: [viewedName],
            location: formData.issuingOrganization.trim(),
            trainingCertId: certDocRef.id,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        }
      } catch (calErr) {
        console.warn("Could not sync training event to Master Calendar:", calErr);
      }

      toast.success("Training & certification saved and added to Master Calendar");
      setFormData({
        trainingTitle: "",
        trainingCategory: "OSHA / Safety Compliance",
        issuingOrganization: "",
        credentialId: "",
        completionDate: new Date().toISOString().split("T")[0],
        expirationDate: "",
        trainingHours: "",
        notes: "",
        artifactFileName: "",
        artifactMimeType: "",
        artifactSize: 0,
        artifactBase64: "",
      });
      setUploadOpen(false);
      await loadTraining();
    } catch (err) {
      console.error("Error saving training cert:", err);
      toast.error("Failed to save training certificate");
    } finally {
      setSavingUpload(false);
    }
  };

  const handleDownloadArtifact = (item: UserTrainingCertDoc) => {
    if (!item.artifactBase64) return;
    const link = document.createElement("a");
    link.href = item.artifactBase64.startsWith("data:")
      ? item.artifactBase64
      : `data:${item.artifactMimeType || "application/pdf"};base64,${item.artifactBase64}`;
    link.download = item.artifactFileName || `${item.trainingTitle}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteUploadedCert = async (item: UserTrainingCertDoc) => {
    if (!db) return;
    if (!confirm(`Delete training certificate "${item.trainingTitle}"?`)) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.USER_TRAINING_CERTS, item.id));
      // Also remove linked Master Calendar events
      try {
        const linkedCalSnap = await getDocs(
          query(
            collection(db, COLLECTIONS.CALENDAR_EVENTS),
            where("trainingCertId", "==", item.id)
          )
        );
        for (const calDoc of linkedCalSnap.docs) {
          await deleteDoc(doc(db, COLLECTIONS.CALENDAR_EVENTS, calDoc.id));
        }
      } catch {
        // non-blocking
      }
      toast.success("Training record removed");
      await loadTraining();
    } catch {
      toast.error("Failed to delete training record");
    }
  };

  const activeCertCount =
    certificates.length +
    uploadedCerts.filter((c) => !getExpirationStatus(c.expirationDate).isExpired)
      .length;
  const expiringOrExpiredCount = uploadedCerts.filter((c) => {
    const st = getExpirationStatus(c.expirationDate);
    return st.isExpired || st.isExpiringSoon;
  }).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>My Mission Critical</span>
            <span>/</span>
            <span>My Training and Certs</span>
            {isMasqueradingUser && (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                Viewing as {viewedName}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            My Training and Certs
          </h1>
          <p className="text-sm text-muted-foreground">
            Enrolled courses, uploaded certification artifacts, and expiration tracking for {viewedName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Training / Certification
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Upload Training or Certification Artifact</DialogTitle>
                <DialogDescription>
                  Upload your certificate or training completion card (stored in Base64 format) along with credential metadata and required expiration date.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-3">
                <div className="space-y-1.5">
                  <Label htmlFor="trainingTitle">
                    Training / Certification Title *
                  </Label>
                  <Input
                    id="trainingTitle"
                    value={formData.trainingTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, trainingTitle: e.target.value })
                    }
                    placeholder="e.g. OSHA 30-Hour Construction / NFPA 70E Arc Flash"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="trainingCategory">Training Category *</Label>
                    <Select
                      value={formData.trainingCategory}
                      onValueChange={(v) =>
                        setFormData({ ...formData, trainingCategory: v })
                      }
                    >
                      <SelectTrigger id="trainingCategory">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRAINING_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="issuingOrganization">
                      Issuing Organization / Provider *
                    </Label>
                    <Input
                      id="issuingOrganization"
                      value={formData.issuingOrganization}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          issuingOrganization: e.target.value,
                        })
                      }
                      placeholder="e.g. OSHA / NFPA / Red Cross / Sunbelt"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="credentialId">
                      Certificate / Credential ID #
                    </Label>
                    <Input
                      id="credentialId"
                      value={formData.credentialId}
                      onChange={(e) =>
                        setFormData({ ...formData, credentialId: e.target.value })
                      }
                      placeholder="e.g. CERT-948210"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="trainingHours">Training Hours / CEUs</Label>
                    <Input
                      id="trainingHours"
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.trainingHours}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          trainingHours: e.target.value,
                        })
                      }
                      placeholder="e.g. 30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="completionDate">Completion / Issue Date *</Label>
                    <Input
                      id="completionDate"
                      type="date"
                      value={formData.completionDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          completionDate: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="expirationDate" className="text-primary font-semibold">
                      Expiration Date (Required) *
                    </Label>
                    <Input
                      id="expirationDate"
                      type="date"
                      value={formData.expirationDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          expirationDate: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="artifactFile">
                    Attachment Artifact (PDF, PNG, JPG, WEBP — stored as Base64) *
                  </Label>
                  <Input
                    id="artifactFile"
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    onChange={(e) => handleFileChange(e.target.files?.[0])}
                  />
                  {formData.artifactFileName && (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Attached: {formData.artifactFileName} (
                      {Math.round(formData.artifactSize / 1024)} KB encoded as Base64)
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="trainingNotes">Notes / Instructor / Location</Label>
                  <Textarea
                    id="trainingNotes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Instructor name, jobsite requirement, or renewal notes..."
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setUploadOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleSaveTrainingCert()}
                  disabled={
                    savingUpload ||
                    !formData.trainingTitle.trim() ||
                    !formData.issuingOrganization.trim() ||
                    !formData.expirationDate.trim() ||
                    !formData.artifactBase64
                  }
                >
                  {savingUpload ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Save Training &amp; Artifact
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" asChild>
            <Link href="/academy">
              <BookOpen className="mr-2 h-4 w-4" />
              Browse Adams Learning Academy
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              Enrolled Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{enrollments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              Completed Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {
                enrollments.filter(
                  (e) => e.progressPercentage >= 100 || e.completedAt
                ).length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              Active Certificates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeCertCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              Expiring Soon / Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-2">
              {expiringOrExpiredCount}
              {expiringOrExpiredCount > 0 && (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Uploaded Training & Certifications (Base64 Artifacts + Expiration Dates) */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Uploaded Training &amp; Certifications ({uploadedCerts.length})
            </CardTitle>
            <CardDescription>
              User-uploaded training records and Base64 certification artifacts with expiration tracking.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Add Training / Cert
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : uploadedCerts.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No training or certification artifacts uploaded for {viewedName} yet. Click{" "}
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="text-primary underline font-medium"
              >
                Upload Training / Certification
              </button>{" "}
              to attach your first credential.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Training / Credential</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Issuing Org &amp; ID</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Expiration Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Artifact Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadedCerts.map((item) => {
                    const expStatus = getExpirationStatus(item.expirationDate);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.trainingTitle}</div>
                          {item.trainingHours ? (
                            <div className="text-xs text-muted-foreground">
                              {item.trainingHours} hrs
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.trainingCategory}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{item.issuingOrganization}</div>
                          {item.credentialId && (
                            <div className="text-xs font-mono text-muted-foreground">
                              ID: {item.credentialId}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.completionDate || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {item.expirationDate}
                        </TableCell>
                        <TableCell>
                          <Badge variant={expStatus.variant}>{expStatus.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Preview Artifact"
                              onClick={() => setPreviewRecord(item)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Download Artifact"
                              onClick={() => handleDownloadArtifact(item)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete Record"
                              onClick={() => void handleDeleteUploadedCert(item)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course Enrollments */}
      <Card>
        <CardHeader>
          <CardTitle>My Course Enrollments ({enrollments.length})</CardTitle>
          <CardDescription>
            Courses {viewedName} is enrolled in across Adams Learning Academy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : enrollments.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No course enrollments found for {viewedName}.{" "}
              <Link href="/academy" className="text-primary underline">
                Enroll in a course
              </Link>
              .
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enr) => (
                  <TableRow key={enr.id}>
                    <TableCell className="font-medium">{enr.courseTitle}</TableCell>
                    <TableCell className="w-48">
                      <div className="flex items-center gap-2">
                        <Progress value={enr.progressPercentage} className="h-2" />
                        <span className="text-xs text-muted-foreground">
                          {enr.progressPercentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {enr.enrolledAt || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {enr.completedAt || "In Progress"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Academy Issued Certificates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Academy Issued Certifications ({certificates.length})
          </CardTitle>
          <CardDescription>
            Verified completion certificates issued by Adams Learning Academy to {viewedName}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {certificates.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No Academy certificates issued to {viewedName} yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Certificate #</TableHead>
                  <TableHead>Course / Credential</TableHead>
                  <TableHead>Issued Date</TableHead>
                  <TableHead className="text-right">Verify</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-mono text-xs">
                      {cert.certificateNumber}
                    </TableCell>
                    <TableCell className="font-medium">{cert.courseTitle}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {cert.issuedAt || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/portal/admin/academy/certificates">
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Artifact Preview Dialog */}
      <Dialog
        open={Boolean(previewRecord)}
        onOpenChange={(open) => {
          if (!open) setPreviewRecord(null);
        }}
      >
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewRecord?.trainingTitle}</DialogTitle>
            <DialogDescription>
              Issued by {previewRecord?.issuingOrganization} · Expires{" "}
              {previewRecord?.expirationDate}
            </DialogDescription>
          </DialogHeader>
          {previewRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border rounded-lg p-3 bg-muted/30">
                <div>
                  <span className="text-muted-foreground block">Category</span>
                  <span className="font-medium">{previewRecord.trainingCategory}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Credential ID</span>
                  <span className="font-mono">{previewRecord.credentialId || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Completed</span>
                  <span>{previewRecord.completionDate}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Expires</span>
                  <span className="font-semibold">{previewRecord.expirationDate}</span>
                </div>
              </div>

              {previewRecord.artifactMimeType?.startsWith("image/") ? (
                <div className="flex justify-center border rounded-lg p-2 bg-black/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewRecord.artifactBase64}
                    alt={previewRecord.trainingTitle}
                    className="max-h-[480px] object-contain rounded"
                  />
                </div>
              ) : (
                <iframe
                  src={previewRecord.artifactBase64}
                  title={previewRecord.trainingTitle}
                  className="w-full h-[480px] border rounded-lg"
                />
              )}

              {previewRecord.notes && (
                <p className="text-xs text-muted-foreground">
                  Notes: {previewRecord.notes}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            {previewRecord && (
              <Button onClick={() => handleDownloadArtifact(previewRecord)}>
                <Download className="mr-2 h-4 w-4" />
                Download {previewRecord.artifactFileName}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
