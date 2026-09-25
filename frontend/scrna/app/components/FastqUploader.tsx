"use client";

import { useState } from "react";
import styles from "./FastqUploader.module.css";

export default function FastqUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      setStatus("");
      return;
    }

    const name = selectedFile.name.toLowerCase();

    const isCellMatrix =
      name.endsWith(".h5ad") ||
      name.endsWith(".loom") ||
      name.endsWith(".csv");

    if (!isCellMatrix) {
      setFile(null);
      setStatus("Please select a cell matrix file.");
      return;
    }

    setFile(selectedFile);
    setStatus("");
  }

  async function submitFile() {
    if (!file || uploading) {
      return;
    }

    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
      setStatus("API URL is not configured.");
      return;
    }

    setUploading(true);
    setStatus("Uploading...");

    try {
      const response = await fetch(
        `${apiUrl}/submit`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              file.type ||
              "application/octet-stream",

            "X-Filename":
              encodeURIComponent(file.name),
          },

          body: file,
        }
      );

      if (!response.ok) {
        throw new Error(
          `Upload failed (${response.status})`
        );
      }

      const result = await response.json();

      setStatus(
        `Upload complete. Job ID: ${
          result.jobId ?? "unknown"
        }`
      );
    } catch (error) {
      console.error(error);

      setStatus(
        "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className={styles.card}>

      <div className={styles.cardHeader}>
        <span className={styles.eyebrow}>
          START AN ANALYSIS
        </span>

        <h2>
          Upload your cell matrix
        </h2>

        <p>
          Select your single-cell count matrix to
          begin the analysis.
        </p>
      </div>

      <label
        className={`${styles.dropzone} ${
          uploading
            ? styles.dropzoneDisabled
            : ""
        }`}
      >
        <div className={styles.uploadIcon}>
          ↑
        </div>

        <div className={styles.dropzoneTitle}>
          Choose your cell matrix
        </div>

        <div className={styles.dropzoneHint}>
          H5AD, LOOM or CSV
        </div>

        <input
          type="file"
          accept=".h5ad,.loom,.csv"
          onChange={handleFileChange}
          disabled={uploading}
          className={styles.fileInput}
        />
      </label>

      {file && (
        <div className={styles.fileCard}>

          <div className={styles.fileIcon}>
            MATRIX
          </div>

          <div className={styles.fileInfo}>
            <div className={styles.fileLabel}>
              SELECTED FILE
            </div>

            <div className={styles.fileName}>
              {file.name}
            </div>

            <div className={styles.fileSize}>
              {formatFileSize(file.size)}
            </div>
          </div>

          <button
            onClick={submitFile}
            disabled={uploading}
            className={styles.submitButton}
          >
            {uploading
              ? "Uploading..."
              : "Submit for Analysis"}
          </button>

        </div>
      )}

      {status && (
        <div
          className={`${styles.status} ${
            status.includes("failed") ||
            status.includes("Please") ||
            status.includes("not configured")
              ? styles.statusError
              : styles.statusSuccess
          }`}
        >
          {status}
        </div>
      )}

    </section>
  );
}

function formatFileSize(bytes: number) {
  const units = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB",
  ];

  let size = bytes;
  let unit = 0;

  while (
    size >= 1024 &&
    unit < units.length - 1
  ) {
    size /= 1024;
    unit++;
  }

  return `${size.toFixed(
    unit === 0 ? 0 : 2
  )} ${units[unit]}`;
}