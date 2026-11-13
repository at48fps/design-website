import styles from "./CapabilitiesSection.module.scss";

/** Text-only page: section headline and short intro, centred on screen. */
export function IntroPage({ title, body }: { title: string; body: string }) {
  return (
    <div className={styles.intro}>
      <h2 className={styles.introTitle} data-lift>{title}</h2>
      <p className={styles.introBody} data-lift>{body}</p>
    </div>
  );
}
