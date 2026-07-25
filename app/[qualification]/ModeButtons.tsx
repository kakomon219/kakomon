/**
 * ファイル: app/[qualification]/ModeButtons.tsx
 * バージョン: v0.1
 * 更新日: 2026-07-26
 * 内容: 新規作成。新しい問題/続きの問題/間違えた問題の3ボタン。
 *      questionIds(このスコープ内の全問題id)を受け取り、ログイン中ユーザーのattemptsと突き合わせて判定する。
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  qualification: string;
  questionIds: number[];
  scopeLabel?: string; // 例: "このテーマの" など、ボタン文言の頭に付ける
};

export default function ModeButtons({ qualification, questionIds, scopeLabel }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const getUserId = () => {
    const id = localStorage.getItem("kakomon_user_id");
    return id ? Number(id) : null;
  };

  // このスコープ内で、ログイン中ユーザーが一度でも解答したことのある question_id 一覧を取得
  const getAnsweredIds = async (userId: number) => {
    const { data } = await supabase
      .from("attempts")
      .select("question_id")
      .eq("user_id", userId)
      .in("question_id", questionIds);
    return new Set((data ?? []).map((a) => a.question_id));
  };

  // このスコープ内で、各問題の「最新の解答」が不正解だったもの一覧を取得
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

  const goToList = (ids: number[], title: string) => {
    if (ids.length === 0) {
      alert("該当する問題がありません。");
      return;
    }
    const qs = new URLSearchParams();
    qs.set("ids", ids.join(","));
    qs.set("title", title);
    router.push(`/${qualification}/list?${qs.toString()}`);
  };

  const handleNew = async () => {
    const userId = getUserId();
    if (!userId) {
      router.push("/select-user");
      return;
    }
    setLoading("new");
    const answered = await getAnsweredIds(userId);
    const unanswered = questionIds.filter((id) => !answered.has(id));
    setLoading(null);
    goToList(unanswered, "新しい問題");
  };

  const handleContinue = async () => {
    const userId = getUserId();
    if (!userId) {
      router.push("/select-user");
      return;
    }
    setLoading("continue");
    const answered = await getAnsweredIds(userId);
    const unanswered = questionIds.filter((id) => !answered.has(id)).sort((a, b) => a - b);
    setLoading(null);
    if (unanswered.length === 0) {
      alert("未解答の問題がありません。");
      return;
    }
    router.push(`/${qualification}/${unanswered[0]}`);
  };

  const handleWrong = async () => {
    const userId = getUserId();
    if (!userId) {
      router.push("/select-user");
      return;
    }
    setLoading("wrong");
    const wrongIds = await getLatestWrongIds(userId);
    setLoading(null);
    goToList(wrongIds, "間違えた問題");
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
      <button onClick={handleNew} disabled={loading !== null}>
        {loading === "new" ? "読み込み中..." : `${scopeLabel ?? ""}新しい問題`}
      </button>
      <button onClick={handleContinue} disabled={loading !== null}>
        {loading === "continue" ? "読み込み中..." : `${scopeLabel ?? ""}続きの問題`}
      </button>
      <button onClick={handleWrong} disabled={loading !== null}>
        {loading === "wrong" ? "読み込み中..." : `${scopeLabel ?? ""}間違えた問題`}
      </button>
    </div>
  );
}
