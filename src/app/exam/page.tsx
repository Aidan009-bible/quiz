import { getExamChapters } from "@/lib/csvReader";
import ExamClient from "./ExamClient";

export const metadata = {
  title: "Mock Examination | MEP English Exam",
  description: "Select a chapter and take the interactive mock examination.",
};

export default function ExamPage() {
  const chapters = getExamChapters();
  return (
    <main style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
      <ExamClient chapters={chapters} />
    </main>
  );
}
