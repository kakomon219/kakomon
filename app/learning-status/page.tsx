/**
 * ファイル: app/learning-status/page.tsx
 * バージョン: v2.0
 * 更新日: 2026-08-10
 * 内容: 解説が長文のため一覧では折りたたみ表示に変更(タップで開閉)。
 *      問題文も長い場合は先頭のみ表示し、全文は解き直し画面で読む形にした。
 */

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type UserRow = { id: number; name: string };

type QuestionRow = {
  id: number;
  qualification: string;
  exam_round: string;
  theme: string;
  question_text: string;
  correct_answer: number;
  explanation: string | null;
};

type AttemptRow = {
  id: number;
  selected_answer: number;
  is_correct: boolean;
  answered_at: string;
  questions: QuestionRow | null;
};

type WrongItem = {
  question: QuestionRow;
  wrongCount: number;
  lastWrongAt: number;
};

type ThemeStat = { total: number; correct: number };
type RoundStat = { total: number; correct: number; themes: Record<string, ThemeStat> };
type QualStat = { total: number; correct: number; rounds: Record<string, RoundStat> };

export default function LearningStatusPage() {
  return (
    <Suspense fallback={<div className="card">読み込み中...</div>}>
      <LearningStatusContent />
    </Suspense>
  );
}

function LearningStatusContent() {
  const searchParams = useSearchParams();
  const filterQualification = searchParams.get("qualification");
  const paramUserId = searchParams.get("user_id");

  const [users, setUsers] = useState<UserRow[]>([]);
  const [viewUserId, setViewUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState<Record<string, QualStat>>({});
  const [wrongList, setWrongList] = useState<WrongItem[]>([]);
  const [today, setToday] = useState("");
  const [copied, setCopied] = useState(false);
  const [backUrl, setBackUrl] = useState("/learning-status");

  // 表示対象ユーザーを決定(URL優先、なければ自分)
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
      })
    );

    if (paramUserId) {
      setViewUserId(Number(paramUserId));
    } else {
      const stored = localStorage.getItem("kakomon_user_id");
      setViewUserId(stored ? Number(stored) : null);
    }
  }, [paramUserId]);

  // 現在のURL(絞り込み・ユーザー選択を含む)を戻り先として保持
  useEffect(() => {
    setBackUrl(window.location.pathname + window.location.search);
  }, [searchParams]);

  // ユーザー一覧を取得
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("users").select("id, name").order("id");
      if (data) setUsers(data as UserRow[]);
    })();
  }, []);

  // 解答履歴と「消した記録」を取得して集計
  useEffect(() => {
    if (viewUserId === null) {
      setLoading(false);
      return;
    }
    setLoading(true);

    (async () => {
      const [attemptsRes, clearsRes] = await Promise.all([
        supabase
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
          .eq("user_id", viewUserId)
          .order("answered_at", { ascending: false }),
        supabase
          .from("review_clears")
          .select("question_id, cleared_at")
          .eq("user_id", viewUserId),
      ]);

      if (attemptsRes.error || !attemptsRes.data) {
        setLoading(false);
        return;
      }

      // 問題ごとの「消した日時」
      const clearedMap = new Map<number, number>();
      (clearsRes.data ?? []).forEach((c: { question_id: number; cleared_at: string }) => {
        clearedMap.set(c.question_id, new Date(c.cleared_at).getTime());
      });

      const newTree: Record<string, QualStat> = {};
      const wrongMap = new Map<number, WrongItem>();

      (attemptsRes.data as unknown as AttemptRow[]).forEach((a) => {
        const q = a.questions;
        if (!q) return;
        if (filterQualification && q.qualification !== filterQualification) return;

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

        if (!a.is_correct) {
          const at = new Date(a.answered_at).getTime();
          const prev = wrongMap.get(q.id);
          if (prev) {
            prev.wrongCount++;
            if (at > prev.lastWrongAt) prev.lastWrongAt = at;
          } else {
            wrongMap.set(q.id, { question: q, wrongCount: 1, lastWrongAt: at });
          }
        }
      });

      // 消した日時より後に間違えたものだけ残す
      const newWrongList = Array.from(wrongMap.values())
        .filter((w) => {
          const clearedAt = clearedMap.get(w.question.id);
          if (clearedAt === undefined) return true;
          return w.lastWrongAt > clearedAt;
        })
        .sort(
          (a, b) => b.wrongCount - a.wrongCount || b.lastWrongAt - a.lastWrongAt
        );

      setTree(newTree);
      setWrongList(newWrongList);
      setLoading(false);
    })();
  }, [viewUserId, filterQualification]);

  const rate = (c: number, t: number) => (t > 0 ? Math.round((c / t) * 100) : 0);

  const viewUserName = users.find((u) => u.id === viewUserId)?.name ?? "";

  /** 長い問題文は先頭のみ表示する */
  const preview = (text: string, len = 80) =>
    text.length > len ? `${text.slice(0, len)}…` : text;

  const buildUserHref = (uid: number) => {
    const qs = new URLSearchParams();
    if (filterQualification) qs.set("qualification", filterQualification);
    qs.set("user_id", String(uid));
    return `/learning-status?${qs.toString()}`;
  };

  /** 解き直しリンク(戻り先として現在のURLを渡す) */
  const buildRetryHref = (q: QuestionRow) => {
    const qs = new URLSearchParams();
    qs.set("from", "review");
    qs.set("back", backUrl);
    return `/${q.qualification}/${q.id}?${qs.toString()}`;
  };

  const buildFullSummaryText = () => {
    const lines: string[] = [];
    lines.push(`学習状況レポート (${today})`);
    if (viewUserName) lines.push(`対象: ${viewUserName}`);
    if (filterQualification) lines.push(`資格: ${filterQualification}`);
    lines.push("");

    Object.entries(tree).forEach(([qualification, qData]) => {
      lines.push(`■ ${qualification}  正答率 ${rate(qData.correct, qData.total)}% (${qData.correct}/${qData.total}問)`);
      Object.entries(qData.rounds).forEach(([round, rData]) => {
        lines.push(`  - ${round}  正答率 ${rate(rData.correct, rData.total)}% (${rData.correct}/${rData.total}問)`);
        Object.entries(rData.themes).forEach(([theme, tData]) => {
          lines.push(`    ・${theme}  正答率 ${rate(tData.correct, tData.total)}% (${tData.correct}/${tData.total}問)`);
        });
      });
      lines.push("");
    });

    if (wrongList.length > 0) {
      lines.push(`■ 間違えた問題 (${wrongList.length}問)`);
      wrongList.forEach((w, i) => {
        lines.push(`${i + 1}. [${w.question.exam_round} / ${w.question.theme}] ${w.wrongCount}回`);
        lines.push(`   ${w.question.question_text}`);
        lines.push("");
      });
    }

    return lines.join("\n");
  };

  const buildMailSummaryText = () => {
    const lines: string[] = [];
    lines.push(`学習状況レポート (${today})`);
    if (viewUserName) lines.push(`対象: ${viewUserName}`);
    if (filterQualification) lines.push(`資格: ${filterQualification}`);
    lines.push("");

    Object.entries(tree).forEach(([qualification, qData]) => {
      lines.push(`■ ${qualification}  正答率 ${rate(qData.correct, qData.total)}% (${qData.correct}/${qData.total}問)`);
      Object.entries(qData.rounds).forEach(([round, rData]) => {
        lines.push(`  - ${round}  正答率 ${rate(rData.correct, rData.total)}% (${rData.correct}/${rData.total}問)`);
        Object.entries(rData.themes).forEach(([theme, tData]) => {
          lines.push(`    ・${theme}  正答率 ${rate(tData.correct, tData.total)}% (${tData.correct}/${tData.total}問)`);
        });
      });
      lines.push("");
    });

    lines.push(`間違えた問題数: ${wrongList.length}問(詳細はアプリでご確認ください)`);
    return lines.join("\n");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildFullSummaryText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("コピーに失敗しました。");
    }
  };

  const handleMailto = () => {
    const subject = encodeURIComponent(`学習状況レポート (${today})`);
    const body = encodeURIComponent(buildMailSummaryText());
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div>
      <header className="status-header">
        <div className="status-header-row">
          <Link href={filterQualification ? `/${filterQualification}` : "/"} className="nav-btn">
            戻る
          </Link>
          <span>{today}</span>
          <span>v2.0</span>
        </div>
        <div className="status-header-path">app/learning-status/page.tsx</div>
      </header>

      <div className="card">
        <h1 style={{ fontSize: "1.1rem", margin: "0 0 8px 0" }}>
          学習状況{filterQualification ? `(${filterQualification})` : "(全資格)"}
        </h1>

        <p style={{ fontSize: 13, color: "#666", margin: "0 0 6px 0" }}>
          ユーザーを選ぶ
        </p>
        <div style={{ marginBottom: 12 }}>
          {users.map((u) => (
            <Link
              key={u.id}
              href={buildUserHref(u.id)}
              className={`tab ${viewUserId === u.id ? "active" : ""}`}
            >
              {u.name}
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="choice-btn" onClick={handleCopy} style={{ marginBottom: 0 }}>
            {copied ? "コピーしました" : "結果をコピー"}
          </button>
          <button className="choice-btn" onClick={handleMailto} style={{ marginBottom: 0 }}>
            メールで送る
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card">読み込み中...</div>
      ) : (
        <>
          <div className="card">
            <h2>分野別 正答率</h2>
            {Object.keys(tree).length === 0 && <p>まだ解答履歴がありません。</p>}

            {Object.entries(tree).map(([qualification, qData]) => (
              <details key={qualification} className="status-block" open>
                <summary>
                  {qualification} - 正答率 {rate(qData.correct, qData.total)}%
                  ({qData.correct}/{qData.total}問)
                </summary>

                {Object.entries(qData.rounds).map(([round, rData]) => (
                  <details key={round} className="status-block-inner">
                    <summary>
                      {round} - 正答率 {rate(rData.correct, rData.total)}%
                      ({rData.correct}/{rData.total}問)
                    </summary>
                    {Object.entries(rData.themes).map(([theme, tData]) => (
                      <div key={theme} className="status-theme-line">
                        {theme} - 正答率 {rate(tData.correct, tData.total)}%
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
            <p style={{ fontSize: 12, color: "#888", margin: "0 0 10px 0" }}>
              間違えた回数の多い順
            </p>
            {wrongList.length === 0 && <p>間違えた問題はありません。</p>}

            {wrongList.map((w) => (
              <div key={w.question.id} className="status-wrong-item">
                <p className="status-wrong-count">⚠ {w.wrongCount}回間違えた</p>
                <p className="status-wrong-meta">
                  {w.question.qualification} / {w.question.exam_round} /{" "}
                  {w.question.theme}
                </p>
                <p>{preview(w.question.question_text)}</p>
                {w.question.explanation && (
                  <details className="status-explanation">
                    <summary>解説を見る</summary>
                    <div
                      className="status-explanation-body"
                      dangerouslySetInnerHTML={{ __html: w.question.explanation }}
                    />
                  </details>
                )}
                <Link href={buildRetryHref(w.question)} className="choice-btn">
                  この問題を解き直す
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
