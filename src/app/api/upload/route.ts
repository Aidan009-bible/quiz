import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
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

    const chapter = nextChapterNumber(type);
    const filename = buildChapterFilename(type, chapter);
    const filePath = `src/data/${filename}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || "Aidan009-bible";
    const repo = process.env.GITHUB_REPO || "quiz";
    const branch = process.env.GITHUB_BRANCH || "main";

    if (token) {
      console.log(`Pushing ${filename} to GitHub repository ${owner}/${repo}...`);
      const contentBase64 = buffer.toString('base64');
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
      
      let fileSha: string | undefined;
      try {
        const getRes = await fetch(url, { headers: { "Authorization": `Bearer ${token}`, "Accept": "application/vnd.github.v3+json" } });
        if (getRes.ok) {
          const getJson = await getRes.json();
          fileSha = getJson.sha;
        }
      } catch (e) {
        // ignore
      }

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
        return NextResponse.json({ error: `GitHub API Error: ${errJson.message}` }, { status: 500 });
      }

    } else {
      const dataDir = path.join(process.cwd(), "src", "data");
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const targetPath = path.join(dataDir, filename);
      await writeFile(targetPath, buffer);
    }

    const label = type === "learning" ? "Learning Course" : "Exam Questions";
    const message = token 
      ? `${label} pushed to GitHub as Chapter ${chapter} (${filename}). Vercel is now rebuilding...`
      : `${label} saved locally as Chapter ${chapter}.`;

    return NextResponse.json({ message, chapter, filename });

  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Server error during upload." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename");
    
    if (!filename) {
      return NextResponse.json({ error: "Missing filename." }, { status: 400 });
    }

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || "Aidan009-bible";
    const repo = process.env.GITHUB_REPO || "quiz";
    const branch = process.env.GITHUB_BRANCH || "main";
    const filePath = `src/data/${filename}`;

    if (token) {
      console.log(`Deleting ${filename} from GitHub repository ${owner}/${repo}...`);
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
      
      let fileSha: string | undefined;
      try {
        const getRes = await fetch(url, { headers: { "Authorization": `Bearer ${token}`, "Accept": "application/vnd.github.v3+json" } });
        if (getRes.ok) {
          fileSha = (await getRes.json()).sha;
        } else {
          return NextResponse.json({ error: "File not found on GitHub." }, { status: 404 });
        }
      } catch (e) {
        return NextResponse.json({ error: "Failed to fetch file metadata from GitHub." }, { status: 500 });
      }

      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Delete chapter ${filename} via Admin Portal`,
          sha: fileSha,
          branch: branch,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        return NextResponse.json({ error: `GitHub API Error: ${errJson.message}` }, { status: 500 });
      }

    } else {
      const targetPath = path.join(process.cwd(), "src", "data", filename);
      if (fs.existsSync(targetPath)) {
        await unlink(targetPath);
      } else {
        return NextResponse.json({ error: "File not found locally." }, { status: 404 });
      }
    }

    return NextResponse.json({ message: `🗑️ Deleted ${filename} successfully. Vercel will rebuild shortly.` });

  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json({ error: "Server error during deletion." }, { status: 500 });
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
