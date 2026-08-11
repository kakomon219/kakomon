/**
 * ファイル: app/[qualification]/ModeButtons.tsx
 * バージョン: v0.9
 * 更新日: 2026-08-10
 * 内容: 「間違えた問題」の判定を学習状況ページと統一。最新解答による自動除外をやめ、
 *      review_clearsで消した日時より後に不正解があるものを対象とし、間違えた回数の
 *      多い順に並べる。起動時に from=wrong を付与しクリアボタンを出せるようにした。
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

type Resume = {
  questionId: number;
  ids: string | null;
  examRound: string | null;
  theme: string | null;
  savedAt: string;
};

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
  const [isResume, setIsResume] = useState(false);

  const getUserId = () => {
    const id = localStorage.getItem("kakomon_user_id");
    return id ? Number(id) : null;
  };

  const getResume = (): Resume | null => {
    const raw = localStorage.getItem(`kakomon_resume_${qualification}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Resume;
    } catch {
      return null;
    }
  };

  const clearResume = () => {
    localStorage.removeItem(`kakomon_resume_${qualification}`);
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
        // 学習状況ページと同じ判定にする:
        // 消した日時(review_clears.cleared_at)より後に不正解があるものを対象とし、
        // 間違えた回数の多い順に並べる。
        const [attemptsRes, clearsRes] = await Promise.all([
          supabase
            .from("attempts")
            .select("question_id, is_correct, answered_at")
            .eq("user_id", userId)
            .in("question_id", poolIds),
          supabase
            .from("review_clears")
            .select("question_id, cleared_at")
            .eq("user_id", userId),
        ]);

        const clearedMap = new Map<number, number>();
        (clearsRes.data ?? []).forEach((c) => {
          clearedMap.set(c.question_id, new Date(c.cleared_at).getTime());
        });

        const wrongMap = new Map<number, { count: number; lastWrongAt: number }>();
        (attemptsRes.data ?? []).forEach((a) => {
          if (a.is_correct) return;
          const at = new Date(a.answered_at).getTime();
          const prev = wrongMap.get(a.question_id);
          if (prev) {
            prev.count++;
            if (at > prev.lastWrongAt) prev.lastWrongAt = at;
          } else {
            wrongMap.set(a.question_id, { count: 1, lastWrongAt: at });
          }
        });

        targetIds = Array.from(wrongMap.entries())
          .filter(([qid, w]) => {
            const clearedAt = clearedMap.get(qid);
            if (clearedAt === undefined) return true;
            return w.lastWrongAt > clearedAt;
          })
          .sort(
            (a, b) =>
              b[1].count - a[1].count || b[1].lastWrongAt - a[1].lastWrongAt
          )
          .map(([qid]) => qid);
      }
    }

    const first = pool.find((q) => q.id === targetIds[0]);
    setMode(m);
    setSelectedExamRound(examRound);
    setSelectedTheme(theme);
    setConfirmIds(targetIds);
    setAnsweredCount(answered);
    setFirstQuestion(first);
    setIsResume(false);
    setLoading(false);
    setStep("confirm");
  };

  /** 前回中止した位置から再開する確認パネルを組み立てる */
  const buildResumeConfirm = (resume: Resume) => {
    const ids = resume.ids
      ? resume.ids
          .split(",")
          .map((s) => Number(s))
          .filter((n) => !Number.isNaN(n))
      : [];

    const startIndex = ids.indexOf(resume.questionId);
    const remainingIds = startIndex >= 0 ? ids.slice(startIndex) : ids;
    const first = allQuestions.find((q) => q.id === remainingIds[0]);

    if (!first) return false;

    setMode("continue");
    setSelectedExamRound(resume.examRound ?? undefined);
    setSelectedTheme(resume.theme ?? undefined);
    setConfirmIds(remainingIds);
    setAnsweredCount(0);
    setFirstQuestion(first);
    setIsResume(true);
    setStep("confirm");
    return true;
  };

  const startMode = (m: Mode) => {
    if (m === "continue") {
      const resume = getResume();
      if (resume && buildResumeConfirm(resume)) return;
      buildConfirm(m, allQuestions, undefined, undefined);
      return;
    }
    if (m === "wrong") {
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
    // 間違えた問題モードでは、正解時に一覧から消せるようにする
    if (mode === "wrong") qs.set("from", "wrong");

    clearResume();
    router.push(`/${qualification}/${confirmIds[0]}?${qs.toString()}`);
  };

  /** 再開記録を捨てて未回答の最小idから始め直す */
  const startFromBeginning = () => {
    clearResume();
    buildConfirm("continue", allQuestions, undefined, undefined);
  };

  const resetToMenu = () => {
    setStep("menu");
    setMode(null);
    setSelectedExamRound(undefined);
    setSelectedTheme(undefined);
    setConfirmIds([]);
    setFirstQuestion(undefined);
    setIsResume(false);
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
          {isResume && (
            <p className="mode-confirm-line">前回中止した位置から再開します</p>
          )}
          {mode === "wrong" && confirmIds.length > 0 && (
            <p className="mode-confirm-line">間違えた回数の多い順に出題します</p>
          )}
          <p className="mode-confirm-line">
            {mode === "continue" || mode === "wrong" ? "次に解く範囲" : "絞り込み中"}:{" "}
            {scopeText()}
          </p>
          <p className="mode-confirm-line">
            対象 {confirmIds.length}問
            {(mode === "new" || mode === "continue") && !isResume
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

          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button
              className="choice-btn"
              style={{ marginBottom: 0 }}
              onClick={start}
              disabled={confirmIds.length === 0}
            >
              {mode === "browse" ? "一覧を見る" : "ここから始める"}
            </button>
            {isResume && (
              <button
                className="choice-btn"
                style={{ marginBottom: 0 }}
                onClick={startFromBeginning}
              >
                最初から始める
              </button>
            )}
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
