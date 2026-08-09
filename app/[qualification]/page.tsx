/**
 * ファイル: app/[qualification]/page.tsx
 * バージョン: v0.14
 * 更新日: 2026-08-10
 * 内容: 級・回/テーマの絞り込みタブと問題カード一覧を撤去。
 *      全問題(id・question_no・question_text・exam_round・theme)を取得し、
 *      ModeButtonsに渡してモード選択→級選択→テーマ選択→確認の
 *      段階フローに一本化した。
 */

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ModeButtons from "./ModeButtons";
import StatsBadge from "./StatsBadge";

export const dynamic = "force-dynamic";

export default async function QualificationPage({
  params,
}: {
  params: { qualification: string };
}) {
  const qualification = decodeURIComponent(params.qualification);

  const { data, error } = await supabase
    .from("questions")
    .select("id, question_no, question_text, exam_round, theme")
    .eq("qualification", qualification);

  if (error) {
    return <p>読み込みエラー: {error.message}</p>;
  }

  const questions = data ?? [];

  return (
    <div>
      <p>
        <Link href="/">← 資格選択に戻る</Link>
      </p>
      <h1>{qualification}</h1>

      <StatsBadge questionIds={questions.map((q) => q.id)} label="資格全体" />

      <p>
        <Link
          href={`/learning-status?qualification=${encodeURIComponent(qualification)}`}
          className="nav-btn"
        >
          この資格の学習状況を見る
        </Link>
      </p>

      <ModeButtons qualification={params.qualification} allQuestions={questions} />
    </div>
  );
}
