import { ProgressOverview } from "@/components/progress/ProgressOverview";
import { Breakdown } from "@/components/progress/Breakdown";
import { Wrongbook } from "@/components/progress/Wrongbook";
import { History } from "@/components/progress/History";
import { BarChart3 } from "lucide-react";

export default function Progress() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 size={16} className="text-blueprint-500" />
        <h1 className="font-mono text-xl text-blueprint-50">进度统计</h1>
        <span className="bp-eyebrow ml-2">PROGRESS</span>
      </div>

      <ProgressOverview />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Breakdown />
        <Wrongbook />
      </div>

      <History />
    </div>
  );
}
