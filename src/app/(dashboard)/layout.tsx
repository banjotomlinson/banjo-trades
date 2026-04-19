import Sidebar from "@/components/layout/Sidebar";
import ThemeProvider from "@/components/providers/ThemeProvider";
import ProfileProvider from "@/components/providers/ProfileProvider";
import SidebarProvider from "@/components/providers/SidebarProvider";
import DashboardMain from "@/components/layout/DashboardMain";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <ProfileProvider>
        <SidebarProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <DashboardMain>{children}</DashboardMain>
          </div>
        </SidebarProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}
