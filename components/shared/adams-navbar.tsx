"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export function AdamsNavbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src={isHome ? "/images/adamselectric_logo.png" : "/images/adamselectric_logo.png"}
            alt="Adams Electric"
            width={isHome ? 200 : 180}
            height={isHome ? 60 : 60}
            className="h-12 w-auto"
            priority
            unoptimized={isHome}
          />
        </Link>
        <nav className="flex items-center gap-2" aria-label="Primary navigation">
          <Link
            href="/academy"
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
          >
            Adams LMS
          </Link>
          <Link
            href="/safety-calendar"
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
          >
            Safety Calendar
          </Link>
          <Link
            href="/sign-in"
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
