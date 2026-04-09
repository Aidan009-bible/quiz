import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import fs from "fs";
import { nextChapterNumber, buildChapterFilename } from "@/lib/csvReader";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file || !type) {
      return NextResponse.json({ error: "Missing file or type." }, { status: 400 });
    }
    if (!file.name.endsWith(".csv")) {
      return NextResponse.json({ error: "Only .csv files are accepted." }, { status: 400 });
    }
    if (type !== "learning" && type !== "questions") {
      return NextResponse.json({ error: "Invalid file type specified." }, { status: 400 });
    }

    // Determine the next chapter number and filename
    const chapter = nextChapterNumber(type);
    const filename = buildChapterFilename(type, chapter);
    const dataDir = path.join(process.cwd(), "src", "data");

    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const targetPath = path.join(dataDir, filename);

    await writeFile(targetPath, buffer);

    const label = type === "learning" ? "Learning Course" : "Exam Questions";
    return NextResponse.json({
      message: `${label} saved as Chapter ${chapter} (${filename}). Refresh the relevant page to see the new content added alongside existing chapters.`,
      chapter,
      filename,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Server error during upload." }, { status: 500 });
  }
}

// Also expose GET to list current chapters
export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), "src", "data");
    if (!fs.existsSync(dataDir)) return NextResponse.json({ files: [] });
    const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".csv"));
    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ files: [] });
  }
}
