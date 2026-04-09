"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./admin.module.css";

type FileType = "learning" | "questions";

interface UploadState {
  status: "idle" | "uploading" | "success" | "error";
  message: string;
}

export default function UploadClient() {
  const [learningState, setLearningState]   = useState<UploadState>({ status: "idle", message: "" });
  const [questionsState, setQuestionsState] = useState<UploadState>({ status: "idle", message: "" });
  const [learningDrag, setLearningDrag]     = useState(false);
  const [questionsDrag, setQuestionsDrag]   = useState(false);
  const [existingFiles, setExistingFiles]   = useState<string[]>([]);
  const learningRef  = useRef<HTMLInputElement>(null);
  const questionsRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/upload");
      const json = await res.json();
      setExistingFiles(json.files || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const handleUpload = async (file: File, type: FileType) => {
    const setState = type === "learning" ? setLearningState : setQuestionsState;
    if (!file.name.endsWith(".csv")) {
      setState({ status: "error", message: "Only .csv files are accepted." });
      return;
    }
    setState({ status: "uploading", message: "Uploading…" });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    try {
      const res  = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (res.ok) {
        setState({ status: "success", message: `✅ ${json.message}` });
        loadFiles(); // refresh the file list
      } else {
        setState({ status: "error", message: `❌ ${json.error}` });
      }
    } catch {
      setState({ status: "error", message: "❌ Upload failed. Please try again." });
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete ${filename}? This action will permanently remove it from GitHub.`)) return;

    try {
      const res = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        alert(json.message);
        loadFiles();
      } else {
        alert(json.error);
      }
    } catch {
      alert("Failed to delete the file. Please check server logs.");
    }
  };

  const makeDropProps = (type: FileType) => ({
    onDragOver:  (e: React.DragEvent) => { e.preventDefault(); type === "learning" ? setLearningDrag(true)  : setQuestionsDrag(true);  },
    onDragLeave: ()                   => { type === "learning" ? setLearningDrag(false) : setQuestionsDrag(false); },
    onDrop:      (e: React.DragEvent) => {
      e.preventDefault();
      type === "learning" ? setLearningDrag(false) : setQuestionsDrag(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file, type);
    },
  });

  const StatusBadge = ({ state }: { state: UploadState }) => {
    if (state.status === "idle") return null;
    const cls = state.status === "success" ? styles.badgeSuccess
      : state.status === "error" ? styles.badgeError : styles.badgeUploading;
    return <div className={`${styles.badge} ${cls}`}>{state.message}</div>;
  };

  const learningFiles  = existingFiles.filter((f) => f.includes("learning_course") || f.includes("learning_chapter"));
  const questionFiles  = existingFiles.filter((f) => f.includes("questions_answers") || f.includes("questions_chapter"));

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <Link href="/" className="btn-secondary" style={{ padding: "0.5rem 1.25rem", display: "inline-block", marginBottom: "1.5rem" }}>
          ← Back to Home
        </Link>
        <h1 className={styles.title}>⚙️ Admin Upload Portal</h1>
        <p className={styles.subtitle}>
          Upload a CSV file to <strong>add a new chapter</strong> of learning or exam content.
          Existing chapters are always preserved — new files are saved as Chapter 2, Chapter 3, etc.
        </p>
      </div>

      {/* Upload cards */}
      <div className={styles.grid}>

        {/* Learning CSV */}
        <div className={`glass-panel ${styles.uploadCard}`}>
          <h2 className={styles.cardTitle}>📚 Add Learning Chapter</h2>

          {/* Existing chapters */}
          {learningFiles.length > 0 && (
            <div className={styles.chapterList}>
              <strong>Existing chapters:</strong>
              <ul>
                {learningFiles.map((f, i) => (
                  <li key={f} className={styles.chapterItem}>
                    <div><span className={styles.chNum}>Ch {i + 1}</span> <span>{f}</span></div>
                    <button onClick={() => handleDelete(f)} className={styles.deleteBtn} title="Delete Chapter">✖</button>
                  </li>
                ))}
              </ul>
              <span className={styles.nextChip}>Next upload → Chapter {learningFiles.length + 1}</span>
            </div>
          )}

          <p className={styles.cardDesc}>
            Columns required: <code>course_order, course_title, course_overview, key_points, example_1_type, example_1_text, …</code>
          </p>
          <div
            className={`${styles.dropZone} ${learningDrag ? styles.dropZoneActive : ""}`}
            {...makeDropProps("learning")}
            onClick={() => learningRef.current?.click()}
          >
            <span className={styles.dropIcon}>📂</span>
            <p>Drop <strong>learning CSV</strong> here or <span className={styles.browseLink}>browse</span></p>
            <input ref={learningRef} type="file" accept=".csv" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "learning"); }} />
          </div>
          <StatusBadge state={learningState} />
        </div>

        {/* Questions CSV */}
        <div className={`glass-panel ${styles.uploadCard}`}>
          <h2 className={styles.cardTitle}>📝 Add Exam Question Chapter</h2>

          {/* Existing chapters */}
          {questionFiles.length > 0 && (
            <div className={styles.chapterList}>
              <strong>Existing chapters:</strong>
              <ul>
                {questionFiles.map((f, i) => (
                  <li key={f} className={styles.chapterItem}>
                    <div><span className={styles.chNum}>Ch {i + 1}</span> <span>{f}</span></div>
                    <button onClick={() => handleDelete(f)} className={styles.deleteBtn} title="Delete Chapter">✖</button>
                  </li>
                ))}
              </ul>
              <span className={styles.nextChip}>Next upload → Chapter {questionFiles.length + 1}</span>
            </div>
          )}

          <p className={styles.cardDesc}>
            Columns required: <code>section, question_no, question_type, question_prompt, source_text, correct_answer, explanation, example, marks</code>
          </p>
          <div
            className={`${styles.dropZone} ${questionsDrag ? styles.dropZoneActive : ""}`}
            {...makeDropProps("questions")}
            onClick={() => questionsRef.current?.click()}
          >
            <span className={styles.dropIcon}>📂</span>
            <p>Drop <strong>questions CSV</strong> here or <span className={styles.browseLink}>browse</span></p>
            <input ref={questionsRef} type="file" accept=".csv" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "questions"); }} />
          </div>
          <StatusBadge state={questionsState} />
        </div>
      </div>

      {/* Format guide */}
      <div className={`glass-panel ${styles.guide}`}>
        <h3>📋 CSV Format Guidelines</h3>
        <ul>
          <li>Save your file as <strong>.csv (UTF-8 encoded)</strong> — Excel: File → Save As → CSV UTF-8.</li>
          <li>The first row must be the header row with exact column names.</li>
          <li>Uploaded files are saved as new chapters and <strong>never overwrite</strong> existing ones.</li>
          <li>For <strong>fill_blank</strong>: blanks are marked <code>____</code> in <code>question_prompt</code>; word bank is comma-separated in <code>source_text</code>.</li>
          <li>For <strong>key_points</strong> in learning files: separate each point with a <code>|</code> pipe character.</li>
          <li>After uploading, refresh the Learning or Exam page to see the new chapter.</li>
        </ul>
      </div>
    </div>
  );
}
