import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isToolSlug, tools } from "@/components/tool/tools.config";
import styles from "@/components/tool/ToolFrame.module.scss";

export function generateStaticParams() {
  return Object.keys(tools).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/tool/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (!isToolSlug(slug)) return {};
  return { title: tools[slug].name, alternates: { canonical: `/tool/${slug}` } };
}

export default async function ToolPage({ params }: PageProps<"/tool/[slug]">) {
  const { slug } = await params;
  if (!isToolSlug(slug)) notFound();
  const tool = tools[slug];

  return (
    <iframe
      src={tool.url}
      title={tool.name}
      className={styles.frame}
      allow="clipboard-read; clipboard-write; fullscreen"
      allowFullScreen
    />
  );
}
