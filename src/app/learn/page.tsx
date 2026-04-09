import { getLearningChapters } from "@/lib/csvReader";
import styles from "./page.module.css";
import Link from "next/link";

export const metadata = {
  title: "Learning Materials | MEP English Exam",
  description: "Study course units covering reading, grammar, articles, prepositions, essay and letter writing.",
};

export default function LearnPage() {
  const chapters = getLearningChapters();

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div className={styles.nav}>
          <Link href="/" className="btn-secondary" style={{ padding: "0.5rem 1.25rem", display: "inline-block" }}>
            ← Home
          </Link>
          <Link href="/exam" className="btn-primary" style={{ padding: "0.5rem 1.25rem", display: "inline-block" }}>
            Take the Exam →
          </Link>
        </div>
        <h1 className={styles.title}>Learning Materials</h1>
        <p className={styles.subtitle}>
          {chapters.length} chapter{chapters.length !== 1 ? "s" : ""} available. Study each unit before sitting your examination.
        </p>
      </header>

      {chapters.map((chapter) => (
        <section key={chapter.chapterNum} className={styles.chapterSection}>
          <div className={styles.chapterBanner}>
            <span className={styles.chapterBadge}>📖 {chapter.label}</span>
            <span className={styles.chapterMeta}>{chapter.rows.length} units · {chapter.filename}</span>
          </div>

          <div className={styles.unitGrid}>
            {chapter.rows.map((unit, idx) => {
              const keyPoints = unit.key_points
                ? unit.key_points.split("|").map((p) => p.trim()).filter(Boolean)
                : [];
              const examples: { type: string; text: string }[] = [];
              for (let i = 1; i <= 5; i++) {
                const t  = unit[`example_${i}_type` as keyof typeof unit] as string;
                const tx = unit[`example_${i}_text` as keyof typeof unit] as string;
                if (t && tx) examples.push({ type: t, text: tx });
              }
              return (
                <div key={idx} className={`glass-panel ${styles.unit}`}>
                  <div className={styles.unitHeader}>
                    <span className={styles.unitBadge}>Unit {unit.course_order}</span>
                    <h2 className={styles.unitTitle}>{unit.course_title}</h2>
                  </div>
                  {unit.course_overview && (
                    <p className={styles.overview}>{unit.course_overview}</p>
                  )}
                  {keyPoints.length > 0 && (
                    <div className={styles.keySection}>
                      <h3 className={styles.sectionLabel}>📌 Key Points</h3>
                      <ul className={styles.keyList}>
                        {keyPoints.map((pt, i) => <li key={i}>{pt}</li>)}
                      </ul>
                    </div>
                  )}
                  {examples.length > 0 && (
                    <div className={styles.examplesSection}>
                      <h3 className={styles.sectionLabel}>✏️ Examples</h3>
                      <div className={styles.exampleList}>
                        {examples.map((ex, i) => (
                          <div key={i} className={styles.exampleRow}>
                            <span className={styles.exType}>{ex.type}</span>
                            <p className={styles.exText}>{ex.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className={styles.footer}>
        <p>Finished studying?</p>
        <Link href="/exam" className="btn-primary" style={{ marginTop: "1rem", display: "inline-block" }}>
          Start the Mock Exam
        </Link>
      </div>
    </main>
  );
}
