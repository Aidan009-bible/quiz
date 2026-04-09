import UploadClient from "./UploadClient";

export const metadata = {
  title: "Admin Portal | MEP English Exam",
  description: "Upload new CSV files to update the learning and question content.",
};

export default function AdminPage() {
  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <UploadClient />
    </main>
  );
}
