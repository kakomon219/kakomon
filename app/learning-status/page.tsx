/**
 * ファイル: app/learning-status/page.tsx
 * バージョン: v1.0
 * 更新日: 2026-07-28
 * 内容: ユーザーの資格→級→分野別の正答率と、間違えた問題一覧を表示する学習状況ページ
 */

import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LearningStatusPage({
  searchParams,
}: {
  searchParams: { user_id?: string };
}) {
  const userId = searchParams.user_id;

  if (!userId) {
    return <div className="p-4">ユーザー情報が取得できませんでした。</div>;
  }

  const { data: attempts, error } = await supabase
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
    .eq("user_id", userId)
    .order("answered_at", { ascending: false });

  if (error) {
    return <div className="p-4">データの取得に失敗しました。</div>;
  }

  // 資格→級→分野の階層集計
  const tree: Record<
    string,
    {
      total: number;
      correct: number;
      rounds: Record<
        string,
        {
          total: number;
          correct: number;
          themes: Record<string, { total: number; correct: number }>;
        }
      >;
    }
  > = {};

  const wrongList: typeof attempts = [];

  attempts?.forEach((a: any) => {
    const q = a.questions;
    if (!q) return;

    tree[q.qualification] ??= { total: 0, correct: 0, rounds: {} };
    tree[q.qualification].total++;
    if (a.is_correct) tree[q.qualification].correct++;

    tree[q.qualification].rounds[q.exam_round] ??= {
      total: 0,
      correct: 0,
      themes: {},
    };
    tree[q.qualification].rounds[q.exam_round].total++;
    if (a.is_correct) tree[q.qualification].rounds[q.exam_round].correct++;

    tree[q.qualification].rounds[q.exam_round].themes[q.theme] ??= {
      total: 0,
      correct: 0,
    };
    tree[q.qualification].rounds[q.exam_round].themes[q.theme].total++;
    if (a.is_correct)
      tree[q.qualification].rounds[q.exam_round].themes[q.theme].correct++;

    if (!a.is_correct) wrongList.push(a);
  });

  const rate = (c: number, t: number) => (t > 0 ? Math.round((c / t) * 100) : 0);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <Link href="/" className="text-lg" aria-label="戻る">
          ←
        </Link>
        <h1 className="text-base font-bold">学習状況</h1>
        <div className="w-6" />
      </header>

      <main className="p-4 space-y-8">
        {/* 資格→級→分野 */}
        <section>
          <h2 className="mb-2 text-sm font-bold text-gray-700">分野別 正答率</h2>
          {Object.entries(tree).map(([qualification, qData]) => (
            <details key={qualification} className="mb-2 rounded border border-gray-200 p-2" open>
              <summary className="cursor-pointer font-bold">
                {qualification}　正答率 {rate(qData.correct, qData.total)}%
                　({qData.correct}/{qData.total}問)
              </summary>

              <div className="mt-2 pl-4">
                {Object.entries(qData.rounds).map(([round, rData]) => (
                  <details key={round} className="mb-1">
                    <summary className="cursor-pointer text-sm">
                      {round}　正答率 {rate(rData.correct, rData.total)}%
                      　({rData.correct}/{rData.total}問)
                    </summary>
                    <div className="mt-1 pl-4 text-xs text-gray-600 space-y-1">
                      {Object.entries(rData.themes).map(([theme, tData]) => (
                        <div key={theme}>
                          {theme}　正答率 {rate(tData.correct, tData.total)}%
                          　({tData.correct}/{tData.total}問)
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          ))}
        </section>

        {/* 間違えた問題一覧 */}
        <section>
          <h2 className="mb-2 text-sm font-bold text-gray-700">
            間違えた問題一覧({wrongList.length}問)
          </h2>
          {wrongList.length === 0 && (
            <p className="text-sm text-gray-500">間違えた問題はありません。</p>
          )}
          <ul className="space-y-3">
            {wrongList.map((a: any) => (
              <li key={a.id} className="rounded border border-gray-200 p-3">
                <div className="text-xs text-gray-400">
                  {a.questions.qualification} / {a.questions.exam_round} /{" "}
                  {a.questions.theme}
                </div>
                <div className="mt-1 text-sm">{a.questions.question_text}</div>
                <div className="mt-1 text-xs text-gray-500">
                  あなたの解答:{a.selected_answer}番　正解:
                  {a.questions.correct_answer}番
                </div>
                {a.questions.explanation && (
                  <div className="mt-1 text-xs text-gray-500">
                    {a.questions.explanation}
                  </div>
                )}
                <Link
                  href={`/${a.questions.qualification}/${a.questions.id}`}
                  className="mt-2 inline-block text-xs text-blue-600 underline"
                >
                  この問題を解き直す
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
