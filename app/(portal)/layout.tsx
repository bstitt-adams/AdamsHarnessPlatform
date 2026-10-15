import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { PortalSidebar } from "@/components/portal/portal-sidebar";
import { PortalHeader } from "@/components/portal/portal-header";
import { UserProfileProvider } from "@/contexts/user-profile-context";
import { FeatureVisibilityProvider } from "@/contexts/feature-visibility-context";
import { AffiliateOnboardingWizard } from "@/components/portal/affiliate-onboarding-wizard";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProfileProvider>
      <FeatureVisibilityProvider>
        <SidebarProvider>
          <PortalSidebar />
          <SidebarInset>
            <PortalHeader />
            <main className="flex-1 p-4 md:p-6">{children}</main>
          </SidebarInset>
        </SidebarProvider>
        <AffiliateOnboardingWizard />
      </FeatureVisibilityProvider>
    </UserProfileProvider>
  );
}
