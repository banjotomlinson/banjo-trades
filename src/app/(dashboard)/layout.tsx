import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import ThemeProvider from "@/components/providers/ThemeProvider";
import SidebarProvider from "@/components/providers/SidebarProvider";
import TradingModeProvider from "@/components/providers/TradingModeProvider";
import CalendarFilterProvider from "@/components/providers/CalendarFilterProvider";
import DashboardMain from "@/components/layout/DashboardMain";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <TradingModeProvider>
        <CalendarFilterProvider>
          <SidebarProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <DashboardMain>{children}</DashboardMain>
              <BottomNav />
            </div>
          </SidebarProvider>
        </CalendarFilterProvider>
      </TradingModeProvider>
    </ThemeProvider>
  );
}
