import { CourseCartProvider } from "@/contexts/course-cart-context";
import { UserProfileProvider } from "@/contexts/user-profile-context";

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProfileProvider>
      <CourseCartProvider>
        {children}
      </CourseCartProvider>
    </UserProfileProvider>
  );
}
