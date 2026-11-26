import type { Metadata } from "next";
import styles from "@/components/features/FeaturesPage.module.scss";

export const metadata: Metadata = {
  title: "Features",
  alternates: { canonical: "/features" },
};

/** Features page (opened from the top nav). Placeholder until the content lands. */
export default function FeaturesPage() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Features</h1>
      <p className={styles.body}>Coming soon.</p>
    </main>
  );
}
