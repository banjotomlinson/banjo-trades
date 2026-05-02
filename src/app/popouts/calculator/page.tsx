import PositionCalculator from "@/components/dashboard/PositionCalculator";

export const metadata = {
  title: "Position Calculator · TraderM8",
};

export default function PopoutCalculatorPage() {
  return <PositionCalculator embedded popoutMode />;
}
