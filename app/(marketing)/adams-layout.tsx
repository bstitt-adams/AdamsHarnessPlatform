import { AdamsNavbar } from "@/components/shared/adams-navbar";
import { AdamsFooter } from "@/components/shared/adams-footer";

export default function AdamsMarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AdamsNavbar />
      <main id="main-content" className="flex-1" role="main" tabIndex={-1}>
        {children}
      </main>
      <AdamsFooter />
    </div>
  );
}
