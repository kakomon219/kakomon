/**
 * ファイル: app/learning-status/page.tsx
 * バージョン: v1.0
 * 更新日: 2026-07-28
 * 内容: localStorageのkakomon_user_idを元に、資格→級→分野別の正答率と
 *      間違えた問題一覧を表示する学習状況ページ
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type AttemptRow = {
  id: number;
  selected_answer: number;
  is_correct: boolean;
  answered_at: string;
  questions: {
    id: number;
    qualification: string;
    exam_round: string;
    theme: string;
    question_text: string;
    correct_answer: number;
    explanation: string | null;
  } | null;
};

type ThemeStat = { total: number; correct: number };
type RoundStat = { total: number; correct: number; themes: Record<string, ThemeStat> };
type QualStat = { total: number; correct: number; rounds: Record<string, RoundStat> };

export default function LearningStatusPage() {
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState<Record<string, QualStat>>({});
  const [wrongList, setWrongList] = useState<AttemptRow[]>([]);
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
      })
    );

    const userId = localStorage.getItem("kakomon_user_id");
    if (!userId) {
      setLoading(false);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("attempts")
        .select(
          `
          id,
          selected_answer,
          is_correct,
          answered_at,
          questions (
            id,
            qualification,
            exam_round,
            theme,
            question_text,
            correct_answer,
            explanation
          )
        `
        )
        .eq("user_id", Number(userId))
        .order("answered_at", { ascending: false });

      if (error || !data) {
        setLoading(false);
        return;
      }

      const newTree: Record<string, QualStat> = {};
      const newWrongList: AttemptRow[] = [];

      (data as unknown as AttemptRow[]).forEach((a) => {
        const q = a.questions;
        if (!q) return;

        newTree[q.qualification] ??= { total: 0, correct: 0, rounds: {} };
        newTree[q.qualification].total++;
        if (a.is_correct) newTree[q.qualification].correct++;

        const rounds = newTree[q.qualification].rounds;
        rounds[q.exam_round] ??= { total: 0, correct: 0, themes: {} };
        rounds[q.exam_round].total++;
        if (a.is_correct) rounds[q.exam_round].correct++;

        const themes = rounds[q.exam_round].themes;
        themes[q.theme] ??= { total: 0, correct: 0 };
        themes[q.theme].total++;
        if (a.is_correct) themes[q.theme].correct++;

        if (!a.is_correct) newWrongList.push(a);
      });

      setTree(newTree);
      setWrongList(newWrongList);
      setLoading(false);
    })();
  }, []);

  const rate = (c: number, t: number) => (t > 0 ? Math.round((c / t) * 100) : 0);

  if (loading) return <div className="card">読み込み中...</div>;

  return (
    <div>
      <header className="status-header">
        <div className="status-header-row">
          <Link href="/" className="nav-btn">← 戻る</Link>
          <span>{today}</span>
          <span>v1.0</span>
        </div>
        <div className="status-header-path">app/learning-status/page.tsx</div>
      </header>

      <div className="card">
        <h2>分野別 正答率</h2>
        {Object.keys(tree).length === 0 && <p>まだ解答履歴がありません。</p>}

        {Object.entries(tree).map(([qualification, qData]) => (
          <details key={qualification} className="status-block" open>
            <summary>
              {qualification}　正答率 {rate(qData.correct, qData.total)}%
              　({qData.correct}/{qData.total}問)
            </summary>

            {Object.entries(qData.rounds).map(([round, rData]) => (
              <details key={round} className="status-block-inner">
                <summary>
                  {round}　正答率 {rate(rData.correct, rData.total)}%
                  　({rData.correct}/{rData.total}問)
                </summary>
                {Object.entries(rData.themes).map(([theme, tData]) => (
                  <div key={theme} className="status-theme-line">
                    {theme}　正答率 {rate(tData.correct, tData.total)}%
                    　({tData.correct}/{tData.total}問)
                  </div>
                ))}
              </details>
            ))}
          </details>
        ))}
      </div>

      <div className="card">
        <h2>間違えた問題一覧({wrongList.length}問)</h2>
        {wrongList.length === 0 && <p>間違えた問題はありません。</p>}

        {wrongList.map((a) => (
          <div key={a.id} className="status-wrong-item">
            <p className="status-wrong-meta">
              {a.questions?.qualification} / {a.questions?.exam_round} /{" "}
              {a.questions?.theme}
            </p>
            <p>{a.questions?.question_text}</p>
            <p className="status-wrong-meta">
              あなたの解答:{a.selected_answer}番　正解:{a.questions?.correct_answer}番
            </p>
            {a.questions?.explanation && (
              <p
                className="status-wrong-meta"
                dangerouslySetInnerHTML={{ __html: a.questions.explanation }}
              />
            )}
            {a.questions && (
              <Link
                href={`/${a.questions.qualification}/${a.questions.id}`}
                className="choice-btn"
              >
                この問題を解き直す
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
