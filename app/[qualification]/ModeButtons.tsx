/**
 * ファイル: app/[qualification]/ModeButtons.tsx
 * バージョン: v0.7
 * 更新日: 2026-08-10
 * 内容: 「続きの問題」「間違えた問題」は級・テーマ選択をスキップし、資格全体から
 *      直接対象を集めて確認パネルへ進むように変更。確認パネルには次に解く問題が
 *      属する級・テーマを表示する。「新しい問題」は従来通り級→テーマの選択フロー。
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

  /** 指定した母集団に対してモードごとの対象idを算出し、確認パネルへ進む */
  const buildConfirm = async (
    m: Mode,
    pool: QuestionMeta[],
    examRound: string | undefined,
    theme: string | undefined
  ) => {
    setLoading(true);
    const poolIds = pool.map((q) => q.id);

    let targetIds = poolIds;
    let answered = 0;

    if (m !== "browse") {
      const userId = getUserId();
      if (!userId) {
        setLoading(false);
        router.push("/select-user");
        return;
      }

      if (m === "new" || m === "continue") {
        const { data } = await supabase
          .from("attempts")
          .select("question_id")
          .eq("user_id", userId)
          .in("question_id", poolIds);
        const answeredSet = new Set((data ?? []).map((a) => a.question_id));
        answered = answeredSet.size;
        targetIds = poolIds.filter((id) => !answeredSet.has(id)).sort((a, b) => a - b);
      } else if (m === "wrong") {
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
          .map(([qid]) => qid)
          .sort((a, b) => a - b);
      }
    }

    const first = pool.find((q) => q.id === targetIds[0]);
    setMode(m);
    setSelectedExamRound(examRound);
    setSelectedTheme(theme);
    setConfirmIds(targetIds);
    setAnsweredCount(answered);
    setFirstQuestion(first);
    setLoading(false);
    setStep("confirm");
  };

  const startMode = (m: Mode) => {
    // 続きの問題・間違えた問題は選択不要。資格全体から直接対象を集める
    if (m === "continue" || m === "wrong") {
      buildConfirm(m, allQuestions, undefined, undefined);
      return;
    }
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
    let pool = allQuestions;
    if (selectedExamRound) pool = pool.filter((q) => q.exam_round === selectedExamRound);
    if (theme) pool = pool.filter((q) => q.theme === theme);
    await buildConfirm(mode, pool, selectedExamRound, theme);
  };

  const start = () => {
    if (confirmIds.length === 0) return;
    const qs = new URLSearchParams();
    if (selectedExamRound) qs.set("exam_round", selectedExamRound);
    if (selectedTheme) qs.set("theme", selectedTheme);
    qs.set("ids", confirmIds.join(","));

    if (mode === "browse") {
      qs.set("title", MODE_LABEL.browse);
      router.push(`/${qualification}/list?${qs.toString()}`);
      return;
    }
    router.push(`/${qualification}/${confirmIds[0]}?${qs.toString()}`);
  };

  const resetToMenu = () => {
    setStep("menu");
    setMode(null);
    setSelectedExamRound(undefined);
    setSelectedTheme(undefined);
    setConfirmIds([]);
    setFirstQuestion(undefined);
  };

  /** 確認パネルに出す「今どこを解くか」の表示 */
  const scopeText = () => {
    if (mode === "continue" || mode === "wrong") {
      if (!firstQuestion) return "対象なし";
      return `${firstQuestion.exam_round ?? "全て"} / ${firstQuestion.theme ?? "全て"}`;
    }
    return `${selectedExamRound ?? "全て"} / ${selectedTheme ?? "全て"}`;
  };

  return (
    <div style={{ margin: "12px 0" }}>
      {step === "menu" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="tab" onClick={() => startMode("new")} disabled={loading}>
            新しい問題
          </button>
          <button className="tab" onClick={() => startMode("continue")} disabled={loading}>
            続きの問題
          </button>
          <button className="tab" onClick={() => startMode("wrong")} disabled={loading}>
            間違えた問題
          </button>
          <button className="tab" onClick={() => startMode("browse")} disabled={loading}>
            問題一覧を見る
          </button>
        </div>
      )}

      {step === "menu" && loading && <p>読み込み中...</p>}

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
            <button className="choice-btn" onClick={() => setStep("examRound")}>
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
            {mode === "continue" || mode === "wrong" ? "次に解く範囲" : "絞り込み中"}:{" "}
            {scopeText()}
          </p>
          <p className="mode-confirm-line">
            対象 {confirmIds.length}問
            {mode === "new" || mode === "continue"
              ? ` / 解答済み ${answeredCount}問`
              : ""}
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
            {(mode === "new" || mode === "browse") && (
              <button
                className="choice-btn"
                style={{ marginBottom: 0 }}
                onClick={() => setStep("theme")}
              >
                ← テーマ選択に戻る
              </button>
            )}
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
