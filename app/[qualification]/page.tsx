/**
 * ファイル: app/[qualification]/page.tsx
 * バージョン: v0.11
 * 更新日: 2026-07-26
 * 内容: 一覧のプレビュー表示で、themeが「リスニング」で始まる問題は question_text を隠し、
 *      「🎧 音声問題」のような表示に差し替え(答えが見えてしまうバグの修正)
 */

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ModeButtons from "./ModeButtons";

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
  const selectedThemes = searchParams.theme
    ? searchParams.theme.split(",").filter(Boolean)
    : [];

  const { data, error } = await supabase
    .from("questions")
    .select("id, question_no, question_text, exam_round, theme")
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

  const filtered =
    selectedThemes.length > 0
      ? afterExamRound.filter((q) => q.theme && selectedThemes.includes(q.theme))
      : afterExamRound;

  const buildExamRoundHref = (nextExamRound: string | undefined) => {
    const qs = new URLSearchParams();
    if (nextExamRound) qs.set("exam_round", nextExamRound);
    if (selectedThemes.length > 0) qs.set("theme", selectedThemes.join(","));
    const qsStr = qs.toString();
    return `/${params.qualification}${qsStr ? `?${qsStr}` : ""}`;
  };

  const buildThemeToggleHref = (theme: string) => {
    const isSelected = selectedThemes.includes(theme);
    const nextThemes = isSelected
      ? selectedThemes.filter((t) => t !== theme)
      : [...selectedThemes, theme];

    const qs = new URLSearchParams();
    if (selectedExamRound) qs.set("exam_round", selectedExamRound);
    if (nextThemes.length > 0) qs.set("theme", nextThemes.join(","));
    const qsStr = qs.toString();
    return `/${params.qualification}${qsStr ? `?${qsStr}` : ""}`;
  };

  const buildThemeClearHref = () => {
    const qs = new URLSearchParams();
    if (selectedExamRound) qs.set("exam_round", selectedExamRound);
    const qsStr = qs.toString();
    return `/${params.qualification}${qsStr ? `?${qsStr}` : ""}`;
  };

  const buildQuestionHref = (id: number) => {
    const qs = new URLSearchParams();
    if (selectedExamRound) qs.set("exam_round", selectedExamRound);
    if (selectedThemes.length > 0) qs.set("theme", selectedThemes.join(","));
    const qsStr = qs.toString();
    return `/${params.qualification}/${id}${qsStr ? `?${qsStr}` : ""}`;
  };

  const sortedFiltered = [...filtered].sort((a, b) => {
    if (a.question_no != null && b.question_no != null) {
      return a.question_no - b.question_no;
    }
    return 0;
  });

  // リスニング問題は一覧プレビューで問題文(=放送内容)を表示しない
  const previewLabel = (theme: string | null, text: string) => {
    if (theme?.startsWith("リスニング")) {
      return "🎧 音声問題";
    }
    return `${text.slice(0, 40)}${text.length > 40 ? "…" : ""}`;
  };

  return (
    <div>
      <p>
        <Link href="/">← 資格選択に戻る</Link>
      </p>
      <h1>{qualification}</h1>

      <ModeButtons
        qualification={params.qualification}
        questionIds={afterExamRound.map((q) => q.id)}
        scopeLabel={selectedExamRound ? `${selectedExamRound}の` : ""}
        examRound={selectedExamRound}
      />

      <p>級・回で絞り込み</p>
      <div>
        <Link
          href={buildExamRoundHref(undefined)}
          className={`tab ${!selectedExamRound ? "active" : ""}`}
        >
          全て
        </Link>
        {examRounds.map((r) => (
          <Link
            key={r}
            href={buildExamRoundHref(r)}
            className={`tab ${selectedExamRound === r ? "active" : ""}`}
          >
            {r}
          </Link>
        ))}
      </div>

      <p>テーマで絞り込み(複数選択可)</p>
      <div>
        <Link
          href={buildThemeClearHref()}
          className={`tab ${selectedThemes.length === 0 ? "active" : ""}`}
        >
          全て
        </Link>
        {themes.map((t) => (
          <Link
            key={t}
            href={buildThemeToggleHref(t)}
            className={`tab ${selectedThemes.includes(t) ? "active" : ""}`}
          >
            {t}
          </Link>
        ))}
      </div>

      {selectedThemes.length > 0 && (
        <ModeButtons
          qualification={params.qualification}
          questionIds={filtered.map((q) => q.id)}
          scopeLabel="このテーマの"
          examRound={selectedExamRound}
          themes={selectedThemes}
        />
      )}

      {sortedFiltered.length === 0 && <p>問題がありません。</p>}
      {sortedFiltered.map((q) => (
        <Link key={q.id} href={buildQuestionHref(q.id)} className="card">
          {q.question_no != null ? `No.${q.question_no}` : "No.-"}{" "}
          {previewLabel(q.theme, q.question_text)}
        </Link>
      ))}
    </div>
  );
}
