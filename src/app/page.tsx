import { StudyWallDashboard } from "@/components/dashboard/study-wall-dashboard";
import { subjectWikis } from "@/lib/mock-study-wall";

export default function Home() {
  return (
    <main className="min-h-screen">
      <StudyWallDashboard subjects={subjectWikis} />
    </main>
  );
}
