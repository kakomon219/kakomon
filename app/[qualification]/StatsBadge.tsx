/**
 * ファイル: app/[qualification]/StatsBadge.tsx
 * バージョン: v0.1
 * 更新日: 2026-07-26
 * 内容: 新規作成。指定されたquestionIdsの範囲で、ログイン中ユーザーの回答数・正解数・誤答数を表示する。
 *      正誤は各問題の「最新の解答」で判定する(同じ問題を解き直した場合は最新の結果を採用)。
 */

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  questionIds: number[];
  label: string;
};

export default function StatsBadge({ questionIds, label }: Props) {
  const [stats, setStats] = useState<{ answered: number; correct: number; wrong: number } | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem("kakomon_user_id");
    if (!userId || questionIds.length === 0) {
      setStats({ answered: 0, correct: 0, wrong: 0 });
      return;
    }

    supabase
      .from("attempts")
      .select("question_id, is_correct, answered_at")
      .eq("user_id", Number(userId))
      .in("question_id", questionIds)
      .order("answered_at", { ascending: false })
      .then(({ data }) => {
        const latestByQuestion = new Map<number, boolean>();
        for (const a of data ?? []) {
          if (!latestByQuestion.has(a.question_id)) {
            latestByQuestion.set(a.question_id, a.is_correct);
          }
        }
        const answered = latestByQuestion.size;
        const correct = Array.from(latestByQuestion.values()).filter((v) => v).length;
        const wrong = answered - correct;
        setStats({ answered, correct, wrong });
      });
  }, [questionIds.join(",")]);

  if (!stats) return null;

  return (
    <p className="stats-badge">
      {label}: 回答数 {stats.answered} / 正解 {stats.correct} / 誤答 {stats.wrong}
    </p>
  );
}
