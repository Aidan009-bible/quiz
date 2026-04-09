"use client";

import { useState, useMemo } from "react";
import type { ExamQuestion, Chapter } from "@/lib/csvReader";
import styles from "./exam.module.css";
import Link from "next/link";

// ─── Section constants ────────────────────────────────────────────────────────

type Section = "reading" | "fill_blank" | "rewrite" | "writing";
const SECTION_ORDER: Section[] = ["reading", "fill_blank", "rewrite", "writing"];
const SECTION_LABELS: Record<Section, string> = {
  reading:    "Reading Passage",
  fill_blank: "Fill in the Blank",
  rewrite:    "Rewrite Sentence",
  writing:    "Essay / Letter",
};
const SECTION_ICONS: Record<Section, string> = {
  reading: "📖", fill_blank: "✏️", rewrite: "🔄", writing: "📝",
};

// ─── Root component ───────────────────────────────────────────────────────────

export default function ExamClient({ chapters }: { chapters: Chapter<ExamQuestion>[] }) {
  const [selectedChapter, setSelectedChapter] = useState<Chapter<ExamQuestion> | null>(null);

  if (!selectedChapter) {
    return <ChapterPicker chapters={chapters} onSelect={setSelectedChapter} />;
  }

  return (
    <ChapterExam
      chapter={selectedChapter}
      onBack={() => setSelectedChapter(null)}
    />
  );
}

// ─── Chapter picker screen ────────────────────────────────────────────────────

function ChapterPicker({
  chapters,
  onSelect,
}: {
  chapters: Chapter<ExamQuestion>[];
  onSelect: (c: Chapter<ExamQuestion>) => void;
}) {
  return (
    <div className={styles.pickerContainer}>
      <div className={styles.pickerHeader}>
        <Link href="/" className="btn-secondary" style={{ padding: "0.5rem 1.25rem", display: "inline-block", marginBottom: "1.5rem" }}>
          ← Home
        </Link>
        <h1 className={styles.pickerTitle}>Mock Examination</h1>
        <p className={styles.pickerSub}>Select a chapter to begin. You can freely navigate between sections within the exam.</p>
      </div>

      <div className={styles.chapterCards}>
        {chapters.map((ch) => {
          const sectionCounts: Record<string, number> = {};
          ch.rows.forEach((q) => {
            const s = q._section || "other";
            sectionCounts[s] = (sectionCounts[s] || 0) + 1;
          });
          return (
            <button
              key={ch.chapterNum}
              className={`glass-panel ${styles.chapterCard}`}
              onClick={() => onSelect(ch)}
            >
              <div className={styles.chapterCardNum}>Chapter {ch.chapterNum}</div>
              <div className={styles.chapterCardSections}>
                {SECTION_ORDER.map((s) =>
                  sectionCounts[s] ? (
                    <span key={s} className={styles.sectionPill}>
                      {SECTION_ICONS[s]} {sectionCounts[s]}q
                    </span>
                  ) : null
                )}
              </div>
              <div className={styles.chapterCardFile}>{ch.filename}</div>
              <span className={styles.startBtn}>Start Exam →</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Chapter exam (fully isolated to one chapter) ─────────────────────────────

function ChapterExam({
  chapter,
  onBack,
}: {
  chapter: Chapter<ExamQuestion>;
  onBack: () => void;
}) {
  // Group this chapter's questions by section
  const grouped = useMemo(() => {
    const map: Record<Section, ExamQuestion[]> = {
      reading: [], fill_blank: [], rewrite: [], writing: [],
    };
    chapter.rows.forEach((q) => {
      const s = (q._section || "") as Section;
      if (map[s]) map[s].push(q);
    });
    return map;
  }, [chapter]);

  const [activeSection, setActiveSection] = useState<Section>("reading");
  const [qIdx, setQIdx]       = useState<Record<Section, number>>({ reading: 0, fill_blank: 0, rewrite: 0, writing: 0 });
  const [userAns, setUserAns] = useState<Record<Section, string>>({ reading: "", fill_blank: "", rewrite: "", writing: "" });
  const [submitted, setSubmitted] = useState<Record<Section, boolean>>({ reading: false, fill_blank: false, rewrite: false, writing: false });
  const [fillAns, setFillAns]     = useState<string[]>([]);
  const [fillSubmitted, setFillSubmitted] = useState(false);

  const sectionDone = (s: Section) => {
    if (s === "fill_blank") return fillSubmitted;
    const qs = grouped[s];
    return qs.length > 0 && submitted[s] && qIdx[s] >= qs.length - 1;
  };

  const SectionNav = () => (
    <nav className={styles.sectionNav}>
      {SECTION_ORDER.map((sec) => (
        <button
          key={sec}
          type="button"
          onClick={() => setActiveSection(sec)}
          className={`${styles.sectionStep}
            ${activeSection === sec ? styles.sectionStepActive : ""}
            ${sectionDone(sec) ? styles.sectionStepDone : ""}
          `}
        >
          <span className={styles.stepIcon}>{SECTION_ICONS[sec]}</span>
          <span className={styles.stepLabel}>{SECTION_LABELS[sec]}</span>
          {sectionDone(sec) && <span className={styles.doneCheck}>✓</span>}
        </button>
      ))}
    </nav>
  );

  // ── Fill in the Blank ──────────────────────────────────────────────────────
  if (activeSection === "fill_blank") {
    const qs = grouped.fill_blank;
    if (qs.length === 0) {
      return (
        <div className={styles.container}>
          <TopBar chapter={chapter} onBack={onBack} />
          <SectionNav />
          <div className={`glass-panel ${styles.card}`}>
            <p style={{ color: "#64748b" }}>No fill-in-the-blank questions in this chapter.</p>
          </div>
        </div>
      );
    }

    // Extract paragraph and word bank correctly for both chapter formats:
    // Chapter 1: _prompt = paragraph with blanks,  _source = comma-separated word bank
    // Chapter 2: _source = "paragraph | Word bank: ..." (both in one field, _prompt = blank label)
    const firstQ = qs[0];

    let rawPara: string;
    let wordBankFinal: string[];

    const sourceHasPipe = firstQ._source.includes("|");

    if (sourceHasPipe) {
      // Chapter 2 style: paragraph embedded in _source before the pipe
      const sourceParts = firstQ._source.split("|");
      rawPara = sourceParts[0].trim();
      const bankRaw = sourceParts[1]?.replace(/word bank[:\s]*/i, "").trim() || "";
      wordBankFinal = bankRaw.split(",").map((w) => w.trim()).filter(Boolean);
    } else {
      // Chapter 1 style: paragraph is in _prompt, word bank is in _source
      rawPara = firstQ._prompt;
      wordBankFinal = firstQ._source
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean);
    }

    // Count blanks after we have the correct rawPara
    const blankCount = (rawPara.match(/____/g) || []).length;

    // Correct answers and explanations — one per blank row
    const correctByBlank = qs.map((q) => q._answer.trim());
    const explByBlank    = qs.map((q) => q._explanation.trim());

    const answers = fillAns.length === blankCount ? fillAns : Array(blankCount).fill("");
    const setBlank = (i: number, val: string) => {
      const updated = [...answers];
      updated[i] = val;
      setFillAns(updated);
    };

    const renderParagraph = () => {
      const parts = rawPara.split("____");
      return (
        <p className={styles.fillParagraph}>
          {parts.map((part, i) => (
            <span key={i}>
              {/* Strip trailing " (N)" notation from paragraph parts */}
              {part.replace(/\s*\(\d+\)/g, "  ")}
              {i < parts.length - 1 && (
                fillSubmitted ? (
                  <span className={
                    answers[i]?.trim().toLowerCase() === correctByBlank[i]?.toLowerCase()
                      ? styles.blankCorrect : styles.blankWrong
                  }>
                    {answers[i] || "(empty)"}
                  </span>
                ) : (
                  <input
                    className={styles.blankInput}
                    value={answers[i] || ""}
                    onChange={(e) => setBlank(i, e.target.value)}
                    placeholder={`(${i + 1})`}
                  />
                )
              )}
            </span>
          ))}
        </p>
      );
    };

    return (
      <div className={styles.container}>
        <TopBar chapter={chapter} onBack={onBack} />
        <SectionNav />
        <div className={`glass-panel ${styles.card}`}>
          <div className={styles.qMeta}>
            <span className={styles.sectionTag}>✏️ Fill in the Blank</span>
            <span className={styles.qCounter}>{blankCount} blanks</span>
          </div>

          {wordBankFinal.length > 0 && (
            <div className={styles.wordBank}>
              <strong>Word Bank:</strong>
              <div className={styles.wordBankList}>
                {wordBankFinal.map((w, i) => <span key={i} className={styles.wordBadge}>{w}</span>)}
              </div>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); setFillSubmitted(true); }}>
            <div className={styles.fillBox}>{renderParagraph()}</div>

            {!fillSubmitted ? (
              <button type="submit" className={`btn-primary ${styles.submitBtn}`}>
                Submit All Answers
              </button>
            ) : (
              <div className={styles.resultView}>
                <h3 className={styles.resultHeading}>✅ Answer Key & Explanations</h3>
                <div className={styles.blankResults}>
                  {correctByBlank.map((ans, i) => {
                    const ok = answers[i]?.trim().toLowerCase() === ans.toLowerCase();
                    return (
                      <div key={i} className={`${styles.blankResultRow} ${ok ? styles.blankRowCorrect : styles.blankRowWrong}`}>
                        <div className={styles.blankNum}>#{i + 1}</div>
                        <div className={styles.blankDetail}>
                          <div><span className={styles.yourLabel}>Your answer: </span><span className={ok ? styles.correct : styles.wrong}>{answers[i] || "(empty)"}</span></div>
                          <div><span className={styles.correctLabel}>Correct: </span><strong>{ans}</strong></div>
                          <div className={styles.explText}>{explByBlank[i]}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button type="button" onClick={() => setActiveSection("rewrite")} className={`btn-primary ${styles.nextBtn}`}>
                  Go to Rewrite →
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  // ── Reading / Rewrite / Writing one-at-a-time ─────────────────────────────
  const sectionQs = grouped[activeSection];

  if (!sectionQs || sectionQs.length === 0) {
    return (
      <div className={styles.container}>
        <TopBar chapter={chapter} onBack={onBack} />
        <SectionNav />
        <div className={`glass-panel ${styles.card}`}>
          <p style={{ color: "#64748b" }}>No questions in this section for {chapter.label}.</p>
        </div>
      </div>
    );
  }

  const currentQIdx = qIdx[activeSection];
  const currentQ    = sectionQs[currentQIdx];
  const isLastQ     = currentQIdx >= sectionQs.length - 1;
  const isSubd      = submitted[activeSection];
  const answer      = userAns[activeSection];

  const nextSec = () => {
    const idx  = SECTION_ORDER.indexOf(activeSection);
    const next = SECTION_ORDER[idx + 1];
    if (next) setActiveSection(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted((p) => ({ ...p, [activeSection]: true }));
  };

  const handleNext = () => {
    if (isLastQ) {
      nextSec();
    } else {
      setQIdx((p) => ({ ...p, [activeSection]: p[activeSection] + 1 }));
      setUserAns((p) => ({ ...p, [activeSection]: "" }));
      setSubmitted((p) => ({ ...p, [activeSection]: false }));
    }
  };

  return (
    <div className={styles.container}>
      <TopBar chapter={chapter} onBack={onBack} />
      <SectionNav />
      <div className={`glass-panel ${styles.card}`}>
        <div className={styles.qMeta}>
          <span className={styles.sectionTag}>{SECTION_ICONS[activeSection]} {SECTION_LABELS[activeSection]}</span>
          <span className={styles.qCounter}>Q {currentQIdx + 1} / {sectionQs.length}</span>
        </div>

        {/* Reading passage */}
        {activeSection === "reading" && currentQ._source && (
          currentQIdx === 0 ? (
            <div className={styles.passage}>
              <strong className={styles.passageLabel}>📄 Read the following passage:</strong>
              <p>{currentQ._source}</p>
            </div>
          ) : (
            <details className={styles.passageToggle}>
              <summary>Show passage</summary>
              <p>{currentQ._source}</p>
            </details>
          )
        )}

        {/* Rewrite instruction */}
        {activeSection === "rewrite" && currentQ._instruction && (
          <div className={styles.rewriteInstruction}>
            <strong>Instruction:</strong> {currentQ._instruction}
          </div>
        )}

        {/* Writing format hint */}
        {activeSection === "writing" && currentQ._instruction && (
          <div className={styles.rewriteInstruction}>
            <strong>Format:</strong> {currentQ._instruction}
          </div>
        )}

        <h3 className={styles.questionText}>{currentQ._prompt}</h3>
        {currentQ._marks && <span className={styles.marks}>{currentQ._marks} marks</span>}

        <form onSubmit={handleSubmit} className={styles.form}>
          {!isSubd ? (
            <>
              {activeSection === "writing" ? (
                <textarea
                  className={`input-field ${styles.textarea}`}
                  rows={10}
                  value={answer}
                  onChange={(e) => setUserAns((p) => ({ ...p, [activeSection]: e.target.value }))}
                  placeholder="Write your answer here..."
                />
              ) : (
                <input
                  type="text"
                  className={`input-field ${styles.largeInput}`}
                  value={answer}
                  onChange={(e) => setUserAns((p) => ({ ...p, [activeSection]: e.target.value }))}
                  placeholder="Type your answer here..."
                />
              )}
              <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={!answer.trim()}>
                Submit Answer
              </button>
            </>
          ) : (
            <div className={styles.resultView}>
              <div className={styles.userAnswerBox}>
                <strong>Your Answer:</strong>
                <p style={{ whiteSpace: "pre-wrap" }}>{answer}</p>
              </div>
              <div className={styles.correctAnswerBox}>
                <strong>✅ Correct / Model Answer:</strong>
                <p style={{ whiteSpace: "pre-wrap" }}>{currentQ._answer}</p>
              </div>
              <div className={styles.explanationBox}>
                <strong>💡 Explanation:</strong>
                <p>{currentQ._explanation}</p>
              </div>
              <button type="button" onClick={handleNext} className={`btn-primary ${styles.nextBtn}`}>
                {isLastQ ? "Next Section →" : "Next Question →"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

function TopBar({ chapter, onBack }: { chapter: Chapter<ExamQuestion>; onBack: () => void }) {
  return (
    <div className={styles.topBar}>
      <button type="button" onClick={onBack} className={`btn-secondary ${styles.backBtn}`}>
        ← All Chapters
      </button>
      <span className={styles.chapterLabel}>📝 {chapter.label}</span>
    </div>
  );
}
