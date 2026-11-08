"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { Award, BadgeCheck, Building2, CalendarDays, Clock3, Loader2, ShieldCheck, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type WorkerCertification = {
  id: string;
  title: string;
  category: string;
  issuingOrganization: string;
  completionDate: string;
  expirationDate: string;
  trainingHours: number;
};

type WorkerScanResult = {
  worker: {
    id: string;
    name: string;
    title: string;
    status: string;
    company: string;
    workforceDepartment: string;
    businessUnits: string[];
    avatar: string;
  };
  certifications: WorkerCertification[];
};

function formatDate(value: string) {
  if (!value) return "Not provided";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function certificationStatus(expirationDate: string) {
  const [year, month, day] = expirationDate.split("-").map(Number);
  if (!year || !month || !day) return { label: "No expiration", className: "bg-slate-100 text-slate-700" };
  const days = Math.ceil((new Date(year, month - 1, day).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: "Expired", className: "bg-red-100 text-red-800" };
  if (days <= 30) return { label: `Expires in ${days} days`, className: "bg-amber-100 text-amber-800" };
  return { label: "Current", className: "bg-emerald-100 text-emerald-800" };
}

export default function WorkerScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [result, setResult] = useState<WorkerScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/public/worker/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load worker");
        if (!cancelled) setResult(data);
      })
      .catch((loadError: Error) => {
        if (!cancelled) setError(loadError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const worker = result?.worker;
  const certifications = result?.certifications || [];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <Image src="/images/adamselectric_logo.png" alt="Adams Electric" width={160} height={44} className="h-10 w-auto" priority />
          <Badge className={worker ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : "bg-slate-100 text-slate-700 hover:bg-slate-100"}>
            <ShieldCheck className="mr-1 h-3 w-3" />{worker ? "Verified" : "Unavailable"}
          </Badge>
        </div>

        {loading ? (
          <Card><CardContent className="flex min-h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></CardContent></Card>
        ) : error || !worker ? (
          <Card><CardHeader><CardTitle>Worker unavailable</CardTitle><CardDescription>{error || "This QR code is no longer active."}</CardDescription></CardHeader></Card>
        ) : (
          <>
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-blue-700 to-slate-900 p-5 text-white">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/15 ring-2 ring-white/25">
                    {worker.avatar ? <Image src={worker.avatar} alt={worker.name} width={80} height={80} className="h-full w-full object-cover" unoptimized /> : <UserRound className="h-10 w-10" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">Adams Electric Team Member</p>
                    <h1 className="mt-1 truncate text-2xl font-bold">{worker.name}</h1>
                    <p className="mt-1 text-sm text-blue-100">{worker.title}</p>
                  </div>
                </div>
              </div>
              <CardContent className="grid gap-3 p-4">
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div><p className="text-xs text-muted-foreground">Company</p><p className="text-sm font-medium">{worker.company}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-muted-foreground">Department</p><p className="text-sm font-medium">{worker.workforceDepartment || "Not assigned"}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-muted-foreground">Business Unit</p><p className="text-sm font-medium">{worker.businessUnits[0] || "Adams Electric"}</p></div>
                </div>
                <Badge variant={worker.status === "active" ? "default" : "secondary"} className="w-fit"><BadgeCheck className="mr-1 h-3 w-3" />{worker.status === "active" ? "Active worker" : "Inactive worker"}</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg"><Award className="h-5 w-5 text-primary" />Certifications</CardTitle>
                <CardDescription>{certifications.length ? `${certifications.length} certification record${certifications.length === 1 ? "" : "s"}` : "No certifications are currently on file"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {certifications.map((cert) => {
                  const status = certificationStatus(cert.expirationDate);
                  return (
                    <article key={cert.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="font-semibold leading-snug">{cert.title}</h2>
                          <p className="mt-1 text-sm text-muted-foreground">{cert.issuingOrganization}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Completed</p><p className="font-medium">{formatDate(cert.completionDate)}</p></div></div>
                        <div className="flex items-start gap-2"><Clock3 className="mt-0.5 h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Expires</p><p className="font-medium">{formatDate(cert.expirationDate)}</p></div></div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2"><Badge variant="outline">{cert.category || "Training"}</Badge>{cert.trainingHours ? <Badge variant="outline">{cert.trainingHours} hours</Badge> : null}</div>
                    </article>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
