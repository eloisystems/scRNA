import FastqUploader from "./components/FastqUploader";
import styles from "./module.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.hero}>
          <div className={styles.topBar}>
            <div className={styles.brandMark}>ELOI RNA ANALYSIS PLATFORM</div>
            <nav className={styles.nav} aria-label="Main navigation">
              <a href="#platform">Platform</a>
              <a href="#workflow">Workflow</a>
              <a href="#analysis">Analysis</a>
            </nav>
          </div>

          <div className={styles.heroGrid}>
            <div className={styles.heroContent}>
              <h1>
                From sequence
                <br />
                to <em>insight.</em>
              </h1>
              <p>
                Scalable single-cell analysis built for fast, clear biological
                interpretation.
              </p>
              <div className={styles.ctaRow}>
                <span className={styles.primaryPill}>Single-cell workflows</span>
                <span className={styles.secondaryPill}>High-confidence QC</span>
              </div>
            </div>

            <div className={styles.heroVisual} aria-label="Analysis pipeline preview">
              <div className={styles.visualCard}>
                <div className={styles.visualHeader}>
                  <span>Live pipeline</span>
                  <span className={styles.signalDot} />
                </div>
                <div className={styles.visualFlow}>
                  <span className={styles.nodeActive}>FASTQ</span>
                  <span className={styles.nodeArrow}>&rarr;</span>
                  <span className={styles.node}>QC</span>
                  <span className={styles.nodeArrow}>&rarr;</span>
                  <span className={styles.node}>Clusters</span>
                </div>
                <div className={styles.metricsRow}>
                  <div className={styles.metricBox}>
                    <span>Cells</span>
                    <strong>12.4K</strong>
                  </div>
                  <div className={styles.metricBox}>
                    <span>Score</span>
                    <strong>97.8%</strong>
                  </div>
                </div>
                <div className={styles.visualLegend}>
                  <div>
                    <span className={styles.legendDotA} />
                    Quality control
                  </div>
                  <div>
                    <span className={styles.legendDotB} />
                    Marker discovery
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className={styles.featureGrid} id="workflow">
          <article className={styles.featureCard}>
            <span className={styles.featureTag}>01</span>
            <h3>Quality-first processing</h3>
            <p>Built-in validation and QC checks make early pipeline decisions clearer.</p>
          </article>
          <article className={styles.featureCard}>
            <span className={styles.featureTag}>02</span>
            <h3>Actionable annotation</h3>
            <p>Turn raw transcriptomic output into interpretable biological signals.</p>
          </article>
          <article className={styles.featureCard}>
            <span className={styles.featureTag}>03</span>
            <h3>Research-ready output</h3>
            <p>Share clean summaries, findings, and next steps with your team.</p>
          </article>
        </section>

        <FastqUploader />

        <footer className={styles.footer}>
          <span>ELOI</span>
          <span className={styles.footerDivider}>&middot;</span>
          RNA Analysis Engine
        </footer>
      </div>
    </main>
  );
}
