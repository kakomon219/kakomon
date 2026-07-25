/**
 * ファイル: app/[qualification]/page.tsx
 * バージョン: v0.4
 * 更新日: 2026-07-25
 * 内容: 資格ごとの問題一覧。exam_round(級)とtheme(テーマ)の2段階絞り込みタブを追加
 */

import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function QualificationPage({
  params,
  searchParams,
}: {
  params: { qualification: string };
  searchParams: { exam_round?: string; theme?: string };
}) {
  const qualification = decodeURIComponent(params.qualification);
  const selectedExamRound = searchParams.exam_round;
  const selectedTheme = searchParams.theme;

  const { data, error } = await supabase
    .from("questions")
    .select("id, question_text, exam_round, theme")
    .eq("qualification", qualification);

  if (error) {
    return <p>読み込みエラー: {error.message}</p>;
  }

  const questions = data ?? [];
  const examRounds = Array.from(
    new Set(questions.map((q) => q.exam_round).filter(Boolean))
  ) as string[];

  const afterExamRound = selectedExamRound
    ? questions.filter((q) => q.exam_round === selectedExamRound)
    : questions;

  const themes = Array.from(
    new Set(afterExamRound.map((q) => q.theme).filter(Boolean))
  ) as string[];

  const filtered = selectedTheme
    ? afterExamRound.filter((q) => q.theme === selectedTheme)
    : afterExamRound;

  const buildHref = (
    nextExamRound: string | undefined,
    nextTheme: string | undefined
  ) => {
    const qs = new URLSearchParams();
    if (nextExamRound) qs.set("exam_round", nextExamRound);
    if (nextTheme) qs.set("theme", nextTheme);
    const qsStr = qs.toString();
    return `/${params.qualification}${qsStr ? `?${qsStr}` : ""}`;
  };

  return (
    <div>
      <p>
        <Link href="/">← 資格選択に戻る</Link>
      </p>
      <h1>{qualification}</h1>

      <p>級・回で絞り込み</p>
      <div>
        <Link
          href={buildHref(undefined, undefined)}
          className={`tab ${!selectedExamRound ? "active" : ""}`}
        >
          全て
        </Link>
        {examRounds.map((r) => (
          <Link
            key={r}
            href={buildHref(r, undefined)}
            className={`tab ${selectedExamRound === r ? "active" : ""}`}
          >
            {r}
          </Link>
        ))}
      </div>

      <p>テーマで絞り込み</p>
      <div>
        <Link
          href={buildHref(selectedExamRound, undefined)}
          className={`tab ${!selectedTheme ? "active" : ""}`}
        >
          全て
        </Link>
        {themes.map((t) => (
          <Link
            key={t}
            href={buildHref(selectedExamRound, t)}
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
