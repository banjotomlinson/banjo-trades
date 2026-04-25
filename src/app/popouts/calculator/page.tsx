import PositionCalculator from "@/components/dashboard/PositionCalculator";

export const metadata = {
  title: "Position Calculator · Banjo Trades",
};

export default function PopoutCalculatorPage() {
  return <PositionCalculator embedded />;
}
