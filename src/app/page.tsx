import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <div className={styles.heroGlow}></div>
        <h1 className={styles.title}>
          Promotion Examination <br />
          <span className={styles.highlight}>Ministry of Electrical Power</span>
        </h1>
        <p className={styles.subtitle}>
          Master English competency required for specialized roles. Enhance your vocabulary in energy, power generation, and comprehensive grammar.
        </p>
      </div>

      <div className={styles.cardsGrid}>
        <div className={`glass-panel ${styles.card}`}>
          <div className={styles.iconWrapper}>📚</div>
          <h2>Learning Section</h2>
          <p>Review past examples, study materials, and understand the format of the examination.</p>
          <Link href="/learn" className="btn-secondary" style={{display: 'inline-block', marginTop: '1.5rem', textAlign: 'center'}}>
            Start Learning
          </Link>
        </div>

        <div className={`glass-panel ${styles.card}`}>
          <div className={styles.iconWrapper}>📝</div>
          <h2>Mock Examination</h2>
          <p>Take an interactive step-by-step test including reading, grammar, essay writing, and letter formats.</p>
          <Link href="/exam" className="btn-primary" style={{display: 'inline-block', marginTop: '1.5rem', textAlign: 'center'}}>
            Take the Exam
          </Link>
        </div>

        <div className={`glass-panel ${styles.card}`}>
          <div className={styles.iconWrapper}>⚙️</div>
          <h2>Admin Portal</h2>
          <p>Upload new CSV files to update the learning materials or exam questions without editing any code.</p>
          <Link href="/admin" className="btn-secondary" style={{display: 'inline-block', marginTop: '1.5rem', textAlign: 'center'}}>
            Manage Content
          </Link>
        </div>
      </div>
    </main>
  );
}
