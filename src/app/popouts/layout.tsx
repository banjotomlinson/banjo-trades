import ThemeProvider from "@/components/providers/ThemeProvider";
import TradingModeProvider from "@/components/providers/TradingModeProvider";

// Stripped-down layout for browser popout windows.
// No sidebar, no calendar filter — just enough providers for the
// embedded widget to render and theme correctly.
export default function PopoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <TradingModeProvider>
        <div className="min-h-screen bg-background text-foreground p-3">
          {children}
        </div>
      </TradingModeProvider>
    </ThemeProvider>
  );
}
