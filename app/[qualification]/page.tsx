/**
 * ファイル: app/[qualification]/page.tsx
 * バージョン: v0.7
 * 更新日: 2026-07-26
 * 内容: リスニング問題(themeが「リスニング」で始まる)は一覧プレビューに英文を出さず、
 *      「問◯ (リスニング)」のような表示にする
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
  // テーマは "建築学,共通" のようなカンマ区切りで複数保持
  const selectedThemes = searchParams.theme
    ? searchParams.theme.split(",").filter(Boolean)
    : [];

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

  const filtered =
    selectedThemes.length > 0
      ? afterExamRound.filter((q) => q.theme && selectedThemes.includes(q.theme))
      : afterExamRound;

  // 級・回タブ用(単一選択、切り替え)
  const buildExamRoundHref = (nextExamRound: string | undefined) => {
    const qs = new URLSearchParams();
    if (nextExamRound) qs.set("exam_round", nextExamRound);
    if (selectedThemes.length > 0) qs.set("theme", selectedThemes.join(","));
    const qsStr = qs.toString();
    return `/${params.qualification}${qsStr ? `?${qsStr}` : ""}`;
  };

  // テーマチップ用(複数選択、トグル)
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

  // テーマ「全て」= 選択を全解除
  const buildThemeClearHref = () => {
    const qs = new URLSearchParams();
    if (selectedExamRound) qs.set("exam_round", selectedExamRound);
    const qsStr = qs.toString();
    return `/${params.qualification}${qsStr ? `?${qsStr}` : ""}`;
  };

  return (
    <div>
      <p>
        <Link href="/">← 資格選択に戻る</Link>
      </p>
      <h1>{qualification}</h1>

      <ModeButtons
        qualification={params.qualification}
        questionIds={questions.map((q) => q.id)}
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
        />
      )}

      {filtered.length === 0 && <p>問題がありません。</p>}
      {filtered.map((q, i) => {
        const isListening = q.theme?.startsWith("リスニング") ?? false;
        return (
          <Link
            key={q.id}
            href={`/${params.qualification}/${q.id}`}
            className="card"
          >
            {isListening
              ? `問${i + 1} (${q.theme})`
              : `問${i + 1} ${q.question_text.slice(0, 40)}${
                  q.question_text.length > 40 ? "…" : ""
                }`}
          </Link>
        );
      })}
    </div>
  );
}
