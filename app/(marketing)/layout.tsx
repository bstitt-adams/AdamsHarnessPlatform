import { AdamsNavbar } from "@/components/shared/adams-navbar";
import { ContactPopup } from "@/components/marketing/contact-popup";
import { EventCartProvider } from "@/contexts/event-cart-context";
import { CourseCartProvider } from "@/contexts/course-cart-context";
import { UserProfileProvider } from "@/contexts/user-profile-context";
import { CartProvider } from "@/lib/cart-context";
import { CourseCartDrawer } from "@/components/academy/course-cart-drawer";
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProfileProvider>
      <CartProvider>
        <EventCartProvider>
          <CourseCartProvider>
            <div className="flex min-h-screen flex-col">
              <AdamsNavbar />
              {/* Main content landmark with skip link target - WCAG 2.4.1 */}
              <main id="main-content" className="flex-1" role="main" tabIndex={-1}>
                {children}
              </main>
              <ContactPopup />
              <CourseCartDrawer />
            </div>
          </CourseCartProvider>
        </EventCartProvider>
      </CartProvider>
    </UserProfileProvider>
  );
}
