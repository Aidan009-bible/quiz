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

    // Determine the next chapter number based on locally built files 
    // (on Vercel, this is whatever was packaged at deploy time)
    const chapter = nextChapterNumber(type);
    const filename = buildChapterFilename(type, chapter);
    const filePath = `src/data/${filename}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || "Aidan009-bible";
    const repo = process.env.GITHUB_REPO || "quiz";
    const branch = process.env.GITHUB_BRANCH || "main";

    // If we have a GitHub token, push directly via API (Vercel Prod mode)
    if (token) {
      console.log(`Pushing ${filename} to GitHub repository ${owner}/${repo}...`);
      
      const contentBase64 = buffer.toString('base64');
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
      
      // Step 1: Check if the file already exists on GitHub to get its SHA.
      // This prevents the "sha wasn't supplied" error if a file was recently
      // uploaded but Vercel hasn't finished redeploying yet.
      let fileSha: string | undefined;
      try {
        const getRes = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/vnd.github.v3+json",
          }
        });
        if (getRes.ok) {
          const getJson = await getRes.json();
          fileSha = getJson.sha;
          console.log(`Found existing file on GitHub (SHA: ${fileSha}). Will overwrite.`);
        }
      } catch (e) {
        console.log("File does not exist on GitHub yet or check failed.");
      }

      // Step 2: Push the new content (with the sha if we are overwriting)
      const putBody: Record<string, string> = {
        message: `Add ${type} chapter ${chapter} via Admin Portal`,
        content: contentBase64,
        branch: branch,
      };
      if (fileSha) putBody.sha = fileSha;

      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(putBody),
      });

      if (!res.ok) {
        const errJson = await res.json();
        console.error("GitHub API Error:", errJson);
        return NextResponse.json({ error: `GitHub API Error: ${errJson.message}` }, { status: 500 });
      }

    } else {
      // Local development fallback
      console.log(`Saving ${filename} locally to ${filePath}...`);
      const dataDir = path.join(process.cwd(), "src", "data");
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const targetPath = path.join(dataDir, filename);
      await writeFile(targetPath, buffer);
    }

    const label = type === "learning" ? "Learning Course" : "Exam Questions";
    const message = token 
      ? `${label} pushed exactly to GitHub as Chapter ${chapter} (${filename}). Vercel is now rebuilding the site... Please check back in ~1 minute to see the new content!`
      : `${label} saved locally as Chapter ${chapter} (${filename}). Refresh to see it.`;

    return NextResponse.json({ message, chapter, filename });

  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Server error during upload." }, { status: 500 });
  }
}

// Keep GET for listing current bundled chapters
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
