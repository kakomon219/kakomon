/**
 * ファイル: app/[qualification]/ModeButtons.tsx
 * バージョン: v0.4
 * 更新日: 2026-07-30
 * 内容: 各モードを押したら即遷移せず、確認パネルを表示してから開始する方式に変更。
 *      続きの問題は「解答済み/残り/次の問題」を表示してから開始できる。
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  qualification: string;
  questionIds: number[];
  scopeLabel?: string;
  examRound?: string;
  themes?: string[];
};

type Confirm = {
  mode: "new" | "continue" | "wrong";
  title: string;
  ids: number[];
  answeredCount: number;
  nextQuestion?: { id: number; question_no: number | null; question_text: string };
};

export default function ModeButtons({
  qualification,
  questionIds,
  scopeLabel,
  examRound,
  themes,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  const filterQs = () => {
    const qs = new URLSearchParams();
    if (examRound) qs.set("exam_round", examRound);
    if (themes && themes.length > 0) qs.set("theme", themes.join(","));
    return qs;
  };

  const getUserId = () => {
    const id = localStorage.getItem("kakomon_user_id");
    return id ? Number(id) : null;
  };

  const getAnsweredIds = async (userId: number) => {
    const { data } = await supabase
      .from("attempts")
      .select("question_id")
      .eq("user_id", userId)
      .in("question_id", questionIds);
    return new Set((data ?? []).map((a) => a.question_id));
  };

  const getLatestWrongIds = async (userId: number) => {
    const { data } = await supabase
      .from("attempts")
      .select("question_id, is_correct, answered_at")
      .eq("user_id", userId)
      .in("question_id", questionIds)
      .order("answered_at", { ascending: false });

    const latestByQuestion = new Map<number, boolean>();
    for (const a of data ?? []) {
      if (!latestByQuestion.has(a.question_id)) {
        latestByQuestion.set(a.question_id, a.is_correct);
      }
    }
    return Array.from(latestByQuestion.entries())
      .filter(([, isCorrect]) => !isCorrect)
      .map(([qid]) => qid);
  };

  const fetchQuestion = async (id: number) => {
    const { data } = await supabase
      .from("questions")
      .select("id, question_no, question_text")
      .eq("id", id)
      .single();
    return data ?? undefined;
  };

  const handleNew = async () => {
    const userId = getUserId();
    if (!userId) return router.push("/select-user");
    setLoading("new");
    const answered = await getAnsweredIds(userId);
    const unanswered = questionIds.filter((id) => !answered.has(id));
    setLoading(null);
    setConfirm({
      mode: "new",
      title: "新しい問題",
      ids: unanswered,
      answeredCount: answered.size,
    });
  };

  const handleContinue = async () => {
    const userId = getUserId();
    if (!userId) return router.push("/select-user");
    setLoading("continue");
    const answered = await getAnsweredIds(userId);
    const unanswered = questionIds
      .filter((id) => !answered.has(id))
      .sort((a, b) => a - b);
    const next = unanswered.length > 0 ? await fetchQuestion(unanswered[0]) : undefined;
    setLoading(null);
    setConfirm({
      mode: "continue",
      title: "続きの問題",
      ids: unanswered,
      answeredCount: answered.size,
      nextQuestion: next as Confirm["nextQuestion"],
    });
  };

  const handleWrong = async () => {
    const userId = getUserId();
    if (!userId) return router.push("/select-user");
    setLoading("wrong");
    const wrongIds = await getLatestWrongIds(userId);
    setLoading(null);
    setConfirm({
      mode: "wrong",
      title: "間違えた問題",
      ids: wrongIds,
      answeredCount: 0,
    });
  };

  const start = () => {
    if (!confirm || confirm.ids.length === 0) return;
    const qs = filterQs();

    if (confirm.mode === "continue") {
      const qsStr = qs.toString();
      router.push(`/${qualification}/${confirm.ids[0]}${qsStr ? `?${qsStr}` : ""}`);
      return;
    }
    qs.set("ids", confirm.ids.join(","));
    qs.set("title", confirm.title);
    router.push(`/${qualification}/list?${qs.toString()}`);
  };

  const preview = (text: string) =>
    text.length > 40 ? `${text.slice(0, 40)}…` : text;

  return (
    <div style={{ margin: "12px 0" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="tab active" disabled>
          {scopeLabel ?? ""}メニューから選ぶ
        </button>
        <button
          className={`tab ${confirm?.mode === "new" ? "active" : ""}`}
          onClick={handleNew}
          disabled={loading !== null}
        >
          {loading === "new" ? "読み込み中..." : `${scopeLabel ?? ""}新しい問題`}
        </button>
        <button
          className={`tab ${confirm?.mode === "continue" ? "active" : ""}`}
          onClick={handleContinue}
          disabled={loading !== null}
        >
          {loading === "continue" ? "読み込み中..." : `${scopeLabel ?? ""}続きの問題`}
        </button>
        <button
          className={`tab ${confirm?.mode === "wrong" ? "active" : ""}`}
          onClick={handleWrong}
          disabled={loading !== null}
        >
          {loading === "wrong" ? "読み込み中..." : `${scopeLabel ?? ""}間違えた問題`}
        </button>
      </div>

      {confirm && (
        <div className="mode-confirm">
          <p className="mode-confirm-title">{confirm.title}</p>

          {confirm.mode === "continue" && (
            <>
              <p className="mode-confirm-line">
                解答済み {confirm.answeredCount}問 / 残り {confirm.ids.length}問
              </p>
              {confirm.nextQuestion ? (
                <p className="mode-confirm-line">
                  次の問題:{" "}
                  {confirm.nextQuestion.question_no != null
                    ? `No.${confirm.nextQuestion.question_no} `
                    : ""}
                  {preview(confirm.nextQuestion.question_text)}
                </p>
              ) : (
                <p className="mode-confirm-line">未解答の問題はありません。</p>
              )}
            </>
          )}

          {confirm.mode === "new" && (
            <p className="mode-confirm-line">
              まだ解いていない問題が {confirm.ids.length}問 あります。次の画面で選べます。
            </p>
          )}

          {confirm.mode === "wrong" && (
            <p className="mode-confirm-line">
              直近で間違えた問題が {confirm.ids.length}問 あります。次の画面で選べます。
            </p>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              className="choice-btn"
              style={{ marginBottom: 0 }}
              onClick={start}
              disabled={confirm.ids.length === 0}
            >
              {confirm.mode === "continue" ? "ここから始める" : "一覧へ進む"}
            </button>
            <button
              className="choice-btn"
              style={{ marginBottom: 0 }}
              onClick={() => setConfirm(null)}
            >
              やめる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
