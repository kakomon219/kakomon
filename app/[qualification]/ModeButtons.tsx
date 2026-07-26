/**
 * ファイル: app/[qualification]/ModeButtons.tsx
 * バージョン: v0.3
 * 更新日: 2026-07-26
 * 内容: examRound/themesを受け取り、遷移先(list画面・続きの問題の直接遷移)のURLに
 *      絞り込み条件を引き継ぐようにした(「一覧に戻る」でリセットされる問題の対応)
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

export default function ModeButtons({
  qualification,
  questionIds,
  scopeLabel,
  examRound,
  themes,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

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

  const goToList = (ids: number[], title: string) => {
    if (ids.length === 0) {
      alert("該当する問題がありません。");
      return;
    }
    const qs = filterQs();
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
    const qs = filterQs();
    const qsStr = qs.toString();
    router.push(`/${qualification}/${unanswered[0]}${qsStr ? `?${qsStr}` : ""}`);
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
      <button className="tab active" disabled>
        {scopeLabel ?? ""}メニューから選ぶ
      </button>
      <button className="tab" onClick={handleNew} disabled={loading !== null}>
        {loading === "new" ? "読み込み中..." : `${scopeLabel ?? ""}新しい問題`}
      </button>
      <button className="tab" onClick={handleContinue} disabled={loading !== null}>
        {loading === "continue" ? "読み込み中..." : `${scopeLabel ?? ""}続きの問題`}
      </button>
      <button className="tab" onClick={handleWrong} disabled={loading !== null}>
        {loading === "wrong" ? "読み込み中..." : `${scopeLabel ?? ""}間違えた問題`}
      </button>
    </div>
  );
}
