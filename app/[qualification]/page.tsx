import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function QualificationPage({
  params,
  searchParams,
}: {
  params: { qualification: string };
  searchParams: { theme?: string };
}) {
  const qualification = decodeURIComponent(params.qualification);
  const selectedTheme = searchParams.theme;

  const { data, error } = await supabase
    .from("questions")
    .select("id, question_text, theme")
    .eq("qualification", qualification);

  if (error) {
    return <p>読み込みエラー: {error.message}</p>;
  }

  const questions = data ?? [];
  const themes = Array.from(
    new Set(questions.map((q) => q.theme).filter(Boolean))
  ) as string[];

  const filtered = selectedTheme
    ? questions.filter((q) => q.theme === selectedTheme)
    : questions;

  return (
    <div>
      <p>
        <Link href="/">← 資格選択に戻る</Link>
      </p>
      <h1>{qualification}</h1>

      <div>
        <Link
          href={`/${params.qualification}`}
          className={`tab ${!selectedTheme ? "active" : ""}`}
        >
          全て
        </Link>
        {themes.map((t) => (
          <Link
            key={t}
            href={`/${params.qualification}?theme=${encodeURIComponent(t)}`}
            className={`tab ${selectedTheme === t ? "active" : ""}`}
          >
            {t}
          </Link>
        ))}
      </div>

      {filtered.length === 0 && <p>問題がありません。</p>}
      {filtered.map((q, i) => (
        <Link
          key={q.id}
          href={`/${params.qualification}/${q.id}`}
          className="card"
        >
          問{i + 1} {q.question_text.slice(0, 40)}
          {q.question_text.length > 40 ? "…" : ""}
        </Link>
      ))}
    </div>
  );
}
