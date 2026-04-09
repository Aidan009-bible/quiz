import fs from "fs";
import path from "path";
import Papa from "papaparse";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LearningUnit {
  course_order: string;
  course_title: string;
  course_overview: string;
  key_points: string;
  example_1_type: string;
  example_1_text: string;
  example_2_type: string;
  example_2_text: string;
  example_3_type: string;
  example_3_text: string;
  example_4_type: string;
  example_4_text: string;
  example_5_type: string;
  example_5_text: string;
}

export interface ExamQuestion {
  // Chapter 1 column names
  section?: string;
  question_no?: string;
  question_type?: string;
  question_prompt?: string;
  source_text?: string;
  correct_answer?: string;
  explanation?: string;
  example?: string;
  marks?: string;
  // Chapter 2 column names (different CSV structure)
  instruction?: string;
  prompt?: string;
  answer?: string;
  // Normalised fields (always present after normalisation)
  _section: string;
  _prompt: string;
  _source: string;
  _instruction: string;
  _answer: string;
  _explanation: string;
  _marks: string;
  _chapter: number;
}

export interface Chapter<T> {
  chapterNum: number;
  filename: string;
  label: string;
  rows: T[];
}

// ─── Internal ─────────────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), "src", "data");

function parseFile<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf-8");
  const result = Papa.parse<T>(raw, { header: true, skipEmptyLines: true });
  return result.data;
}

function getFilesMatching(keyword: string): { chapter: number; filePath: string; filename: string }[] {
  if (!fs.existsSync(DATA_DIR)) return [];
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".csv") && f.toLowerCase().includes(keyword))
    .map((f) => {
      const match = f.match(/chapter[_-](\d+)/i);
      const chapter = match ? parseInt(match[1], 10) : 1;
      return { chapter, filePath: path.join(DATA_DIR, f), filename: f };
    })
    .sort((a, b) => a.chapter - b.chapter);
}

// Normalise a raw row from any chapter CSV into consistent fields
function normaliseQuestion(raw: Record<string, string>, chapter: number): ExamQuestion {
  // Determine section — handles both exact keys (e.g. 'reading') and full sentence prompts 
  // (e.g. 'I. Read the passage and answer the questions that follow.')
  const rawSection = (raw.section || "").trim().toLowerCase().replace(/-/g, "_");
  
  let section = rawSection;
  if (rawSection.includes("read") || rawSection.includes("multiple_choice")) {
    section = "reading";
  } else if (rawSection.includes("fill in ") || rawSection === "fill_in_blank" || rawSection.includes("fill_blank")) {
    section = "fill_blank";
  } else if (rawSection.includes("rewrite")) {
    section = "rewrite";
  } else if (rawSection.includes("argument") || rawSection.includes("essay") || rawSection.includes("letter") || rawSection.includes("writing")) {
    section = "writing";
  }

  return {
    ...raw,
    _section: section,
    _prompt:       (raw.question_prompt || raw.prompt || "").trim(),
    _source:       (raw.source_text || "").trim(),
    _instruction:  (raw.instruction || raw.example || "").trim(),
    _answer:       (raw.correct_answer || raw.answer || "").trim(),
    _explanation:  (raw.explanation || "").trim(),
    _marks:        (raw.marks || "").trim(),
    _chapter:      chapter,
  } as ExamQuestion;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getLearningChapters(): Chapter<LearningUnit>[] {
  const files = getFilesMatching("learning_course");
  return files.map(({ chapter, filePath, filename }) => ({
    chapterNum: chapter,
    filename,
    label: `Chapter ${chapter}`,
    rows: parseFile<LearningUnit>(filePath),
  }));
}

export function getExamChapters(): Chapter<ExamQuestion>[] {
  const files = getFilesMatching("questions_answers");
  return files.map(({ chapter, filePath, filename }) => {
    const raw = parseFile<Record<string, string>>(filePath);
    return {
      chapterNum: chapter,
      filename,
      label: `Chapter ${chapter}`,
      rows: raw.map((r) => normaliseQuestion(r, chapter)),
    };
  });
}

// ── Chapter management helpers ────────────────────────────────────────────────

export function nextChapterNumber(type: "learning" | "questions"): number {
  const keyword = type === "learning" ? "learning_course" : "questions_answers";
  const existing = getFilesMatching(keyword);
  if (existing.length === 0) return 1;
  return Math.max(...existing.map((e) => e.chapter)) + 1;
}

export function buildChapterFilename(type: "learning" | "questions", chapter: number): string {
  if (type === "learning") {
    return chapter === 1
      ? "ministry_power_learning_course_v2.csv"
      : `learning_course_chapter_${chapter}.csv`;
  }
  return chapter === 1
    ? "ministry_power_questions_answers_explanations.csv"
    : `questions_answers_chapter_${chapter}.csv`;
}

// Backward compat
export type QuestionRecord = ExamQuestion;
export function getExamQuestions(): ExamQuestion[] {
  return getExamChapters().flatMap((c) => c.rows);
}
export function getLearningUnits(): LearningUnit[] {
  return getLearningChapters().flatMap((c) => c.rows);
}
