/**
 * ファイル: app/[qualification]/ModeButtons.tsx
 * バージョン: v0.6
 * 更新日: 2026-08-10
 * 内容: 「新しい問題/続きの問題/間違えた問題/問題一覧を見る」を選んだ後、
 *      級選択→テーマ選択→確認パネル、という段階フローに変更。
 *      確認パネルには選択中の級・テーマを表示する。
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

type QuestionMeta = {
  id: number;
  question_no: number | null;
  question_text: string;
  exam_round: string | null;
  theme: string | null;
};

type Props = {
  qualification: string;
  allQuestions: QuestionMeta[];
};

type Mode = "new" | "continue" | "wrong" | "browse";
type Step = "menu" | "examRound" | "theme" | "confirm";

const MODE_LABEL: Record<Mode, string> = {
  new: "新しい問題",
  continue: "続きの問題",
  wrong: "間違えた問題",
  browse: "問題一覧を見る",
};

export default function ModeButtons({ qualification, allQuestions }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("menu");
  const [mode, setMode] = useState<Mode | null>(null);
  const [selectedExamRound, setSelectedExamRound] = useState<string | undefined>(undefined);
  const [selectedTheme, setSelectedTheme] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const [confirmIds, setConfirmIds] = useState<number[]>([]);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [firstQuestion, setFirstQuestion] = useState<QuestionMeta | undefined>(undefined);

  const getUserId = () => {
    const id = localStorage.getItem("kakomon_user_id");
    return id ? Number(id) : null;
  };

  const examRounds = Array.from(
    new Set(allQuestions.map((q) => q.exam_round).filter(Boolean))
  ) as string[];

  const themesForExamRound = (examRound: string | undefined) => {
    const pool = examRound
      ? allQuestions.filter((q) => q.exam_round === examRound)
      : allQuestions;
    return Array.from(new Set(pool.map((q) => q.theme).filter(Boolean))) as string[];
  };

  const preview = (text: string) =>
    text.length > 40 ? `${text.slice(0, 40)}…` : text;

  const startMode = (m: Mode) => {
    setMode(m);
    setSelectedExamRound(undefined);
    setSelectedTheme(undefined);
    setStep("examRound");
  };

  const chooseExamRound = (examRound: string | undefined) => {
    setSelectedExamRound(examRound);
    setSelectedTheme(undefined);
    setStep("theme");
  };

  const chooseTheme = async (theme: string | undefined) => {
    if (!mode) return;
    setSelectedTheme(theme);
    setLoading(true);

    let pool = allQuestions;
    if (selectedExamRound) pool = pool.filter((q) => q.exam_round === selectedExamRound);
    if (theme) pool = pool.filter((q) => q.theme === theme);
    const poolIds = pool.map((q) => q.id);

    let targetIds = poolIds;
    let answered = 0;

    if (mode !== "browse") {
      const userId = getUserId();
      if (!userId) {
        setLoading(false);
        router.push("/select-user");
        return;
      }

      if (mode === "new" || mode === "continue") {
        const { data } = await supabase
          .from("attempts")
          .select("question_id")
          .eq("user_id", userId)
          .in("question_id", poolIds);
        const answeredSet = new Set((data ?? []).map((a) => a.question_id));
        answered = answeredSet.size;
        targetIds = poolIds.filter((id) => !answeredSet.has(id)).sort((a, b) => a - b);
      } else if (mode === "wrong") {
        const { data } = await supabase
          .from("attempts")
          .select("question_id, is_correct, answered_at")
          .eq("user_id", userId)
          .in("question_id", poolIds)
          .order("answered_at", { ascending: false });

        const latestByQuestion = new Map<number, boolean>();
        for (const a of data ?? []) {
          if (!latestByQuestion.has(a.question_id)) {
            latestByQuestion.set(a.question_id, a.is_correct);
          }
        }
        targetIds = Array.from(latestByQuestion.entries())
          .filter(([, isCorrect]) => !isCorrect)
          .map(([qid]) => qid);
      }
    }

    const first = pool.find((q) => q.id === targetIds[0]);
    setConfirmIds(targetIds);
    setAnsweredCount(answered);
    setFirstQuestion(first);
    setLoading(false);
    setStep("confirm");
  };

  const start = () => {
    if (confirmIds.length === 0) return;
    const qs = new URLSearchParams();
    if (selectedExamRound) qs.set("exam_round", selectedExamRound);
    if (selectedTheme) qs.set("theme", selectedTheme);

    if (mode === "browse") {
      qs.set("ids", confirmIds.join(","));
      qs.set("title", MODE_LABEL.browse);
      router.push(`/${qualification}/list?${qs.toString()}`);
      return;
    }

    qs.set("ids", confirmIds.join(","));
    router.push(`/${qualification}/${confirmIds[0]}?${qs.toString()}`);
  };

  const backTo = (target: Step) => {
    setStep(target);
  };

  const resetToMenu = () => {
    setStep("menu");
    setMode(null);
    setSelectedExamRound(undefined);
    setSelectedTheme(undefined);
    setConfirmIds([]);
    setFirstQuestion(undefined);
  };

  return (
    <div style={{ margin: "12px 0" }}>
      {step === "menu" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="tab" onClick={() => startMode("new")}>
            新しい問題
          </button>
          <button className="tab" onClick={() => startMode("continue")}>
            続きの問題
          </button>
          <button className="tab" onClick={() => startMode("wrong")}>
            間違えた問題
          </button>
          <button className="tab" onClick={() => startMode("browse")}>
            問題一覧を見る
          </button>
        </div>
      )}

      {step === "examRound" && mode && (
        <div>
          <p className="mode-confirm-title">{MODE_LABEL[mode]}:級を選んでください</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="tab" onClick={() => chooseExamRound(undefined)}>
              全て
            </button>
            {examRounds.map((r) => (
              <button key={r} className="tab" onClick={() => chooseExamRound(r)}>
                {r}
              </button>
            ))}
          </div>
          <p>
            <button className="choice-btn" onClick={resetToMenu}>
              ← メニューに戻る
            </button>
          </p>
        </div>
      )}

      {step === "theme" && mode && (
        <div>
          <p className="mode-confirm-title">
            {MODE_LABEL[mode]}:テーマを選んでください
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="tab"
              disabled={loading}
              onClick={() => chooseTheme(undefined)}
            >
              全て
            </button>
            {themesForExamRound(selectedExamRound).map((t) => (
              <button
                key={t}
                className="tab"
                disabled={loading}
                onClick={() => chooseTheme(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <p>
            <button className="choice-btn" onClick={() => backTo("examRound")}>
              ← 級選択に戻る
            </button>
          </p>
          {loading && <p>読み込み中...</p>}
        </div>
      )}

      {step === "confirm" && mode && (
        <div className="mode-confirm">
          <p className="mode-confirm-title">{MODE_LABEL[mode]}</p>
          <p className="mode-confirm-line">
            絞り込み中: {selectedExamRound ?? "全て"} / {selectedTheme ?? "全て"}
          </p>
          <p className="mode-confirm-line">
            対象 {confirmIds.length}問
            {mode !== "browse" ? ` / 解答済み ${answeredCount}問` : ""}
          </p>
          {mode !== "browse" &&
            (firstQuestion ? (
              <p className="mode-confirm-line">
                最初の問題:{" "}
                {firstQuestion.question_no != null ? `No.${firstQuestion.question_no} ` : ""}
                {preview(firstQuestion.question_text)}
              </p>
            ) : (
              <p className="mode-confirm-line">対象の問題はありません。</p>
            ))}

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              className="choice-btn"
              style={{ marginBottom: 0 }}
              onClick={start}
              disabled={confirmIds.length === 0}
            >
              {mode === "browse" ? "一覧を見る" : "ここから始める"}
            </button>
            <button
              className="choice-btn"
              style={{ marginBottom: 0 }}
              onClick={() => backTo("theme")}
            >
              ← テーマ選択に戻る
            </button>
            <button
              className="choice-btn"
              style={{ marginBottom: 0 }}
              onClick={resetToMenu}
            >
              やめる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
