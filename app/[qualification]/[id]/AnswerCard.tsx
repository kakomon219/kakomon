/**
 * ファイル: app/[qualification]/[id]/AnswerCard.tsx
 * バージョン: v3.4
 * 更新日: 2026-08-10
 * 内容: from=wrong(間違えた問題モード)に対応。正解時に「一覧から消す」を表示しつつ
 *      「次の問題へ」のループは維持する。from=review(学習状況からの1問復習)は
 *      従来どおり学習状況ページへ戻る導線のみとする。
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import type { Question } from "@/lib/supabase";
import StatsBadge from "../StatsBadge";

const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥"];

/** 配列をランダムにシャッフル(Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 「該当なし」系の選択肢かどうか(シャッフルせず最後尾に固定する) */
function isNoneOption(choice: string | null | undefined): boolean {
  if (!choice) return false;
  return /^該当(するものは)?なし/.test(choice.trim());
}

export default function AnswerCard({
  question,
  nextHref,
  prevHref,
  nextQuestionId,
  questionNumber,
  totalCount,
  sameThemeIds,
  qualification,
  modeIds,
  examRound,
  theme,
}: {
  question: Question;
  nextHref: string | null;
  prevHref: string | null;
  nextQuestionId: number | null;
  questionNumber: number;
  totalCount: number;
  sameThemeIds: number[];
  qualification: string;
  modeIds: string | null;
  examRound: string | null;
  theme: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<number[]>([]);
  const [fromReview, setFromReview] = useState(false);
  const [fromWrong, setFromWrong] = useState(false);
  const [statusHref, setStatusHref] = useState("/learning-status");
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);
  const { play } = useAudioPlayer();

  /** 記述式かどうか */
  const isEssay = question.question_type === "essay";

  /** correct_answerをnull安全な数値に正規化 */
  const correctNum: number = question.correct_answer ?? 0;

  const rawChoices = [
    question.choice_1,
    question.choice_2,
    question.choice_3,
    question.choice_4,
    question.choice_5,
    question.choice_6,
  ];

  /** 起動元(学習状況の1問復習 / 間違えた問題モード)と戻り先を取得 */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    setFromReview(from === "review");
    setFromWrong(from === "wrong");

    const back = params.get("back");
    // 外部URLへの遷移を防ぐため、自サイト内のパスのみ許可する
    if (back && back.startsWith("/")) {
      setStatusHref(back);
    }
  }, []);

  /** 並び順を決める。shuffle_choicesがtrueの問題のみランダム、それ以外は原順 */
  useEffect(() => {
    const choices = [
      question.choice_1,
      question.choice_2,
      question.choice_3,
      question.choice_4,
      question.choice_5,
      question.choice_6,
    ];

    const validNums = choices
      .map((c, i) => (c ? i + 1 : null))
      .filter((n): n is number => n !== null);

    if (!question.shuffle_choices) {
      setDisplayOrder(validNums);
    } else {
      const fixedNums = validNums.filter((n) => isNoneOption(choices[n - 1]));
      const shuffleNums = validNums.filter((n) => !isNoneOption(choices[n - 1]));
      setDisplayOrder([...shuffle(shuffleNums), ...fixedNums]);
    }

    setSelected(null);
    setShowExplanation(false);
    setShowTranslation(false);
    setShowModelAnswer(false);
    setCleared(false);
  }, [
    question.id,
    question.shuffle_choices,
    question.choice_1,
    question.choice_2,
    question.choice_3,
    question.choice_4,
    question.choice_5,
    question.choice_6,
  ]);

  useEffect(() => {
    if (question.audio_url) play(question.audio_url);
  }, [question.audio_url, play]);

  /** 元番号 -> 表示番号 の対応表 */
  const origToDisplay = useMemo(() => {
    const map = new Map<number, number>();
    displayOrder.forEach((origNum, idx) => map.set(origNum, idx + 1));
    return map;
  }, [displayOrder]);

  const displayCorrect = origToDisplay.get(correctNum) ?? 1;

  /** explanation内の丸数字を今回の表示順に付け替える(シャッフル時のみ) */
  const remappedExplanation = useMemo(() => {
    if (!question.explanation || displayOrder.length === 0) {
      return question.explanation;
    }
    if (!question.shuffle_choices) return question.explanation;
    return question.explanation.replace(/[①②③④⑤⑥]/g, (mark) => {
      const origNum = CIRCLED.indexOf(mark) + 1;
      const newNum = origToDisplay.get(origNum);
      return newNum ? CIRCLED[newNum - 1] : mark;
    });
  }, [
    question.explanation,
    question.shuffle_choices,
    origToDisplay,
    displayOrder.length,
  ]);

  const isAnswered = selected !== null;
  const isCorrect = selected === correctNum;
  const isListening = question.theme?.startsWith("リスニング") ?? false;

  const handleSelect = async (origNum: number) => {
    setSelected(origNum);

    const userId = localStorage.getItem("kakomon_user_id");
    if (!userId) return;

    await supabase.from("attempts").insert({
      user_id: Number(userId),
      question_id: question.id,
      selected_answer: origNum,
      is_correct: origNum === correctNum,
      answered_at: new Date().toISOString(),
    });
  };

  /** review_clearsに記録して「間違えた問題」から外す */
  const clearFromWrongList = async () => {
    const userId = localStorage.getItem("kakomon_user_id");
    if (!userId) return false;
    await supabase.from("review_clears").upsert(
      {
        user_id: Number(userId),
        question_id: question.id,
        cleared_at: new Date().toISOString(),
      },
      { onConflict: "user_id,question_id" }
    );
    return true;
  };

  /** 学習状況からの1問復習:消して元のページへ戻る */
  const handleClearAndBack = async () => {
    setClearing(true);
    await clearFromWrongList();
    router.push(statusHref);
  };

  /** 間違えた問題モード:消してその場に留まる(次の問題へは自分で進む) */
  const handleClearStay = async () => {
    setClearing(true);
    const ok = await clearFromWrongList();
    setClearing(false);
    if (ok) setCleared(true);
  };

  /** 消さずに学習状況へ戻る */
  const handleBackToStatus = () => router.push(statusHref);

  /**
   * 中止してモード選択画面へ戻る。
   * answered=true の場合は次の問題を再開位置として保存する。
   * 次の問題が無い(最終問題)場合は再開記録を消す。
   */
  const stopWith = (resumeId: number | null) => {
    const key = `kakomon_resume_${qualification}`;
    if (resumeId == null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(
        key,
        JSON.stringify({
          questionId: resumeId,
          ids: modeIds,
          examRound,
          theme,
          savedAt: new Date().toISOString(),
        })
      );
    }
    router.push(`/${qualification}`);
  };

  /** 解答前の中止:この問題から再開 */
  const handleStopBefore = () => stopWith(question.id);

  /** 解答後の中止:次の問題から再開(最終問題なら記録を消す) */
  const handleStopAfter = () => stopWith(nextQuestionId);

  /** 正解時に「一覧から消す」を出せるか(記述式は正誤記録がないため対象外) */
  const canClear = isCorrect && !isEssay;

  /** 解答後に出す操作ボタン群 */
  const renderAfterButtons = () => {
    // 学習状況からの1問復習:学習状況へ戻る導線のみ
    if (fromReview) {
      return (
        <div className="nav-row" style={{ marginTop: 8 }}>
          {canClear ? (
            <button
              className="nav-btn nav-btn-clear"
              disabled={clearing}
              onClick={handleClearAndBack}
            >
              {clearing ? "消しています..." : "一覧から消す"}
            </button>
          ) : (
            <span />
          )}
          <button className="nav-btn" onClick={handleBackToStatus}>
            学習状況へ戻る
          </button>
        </div>
      );
    }

    // 間違えた問題モード:消す操作を出しつつ、次の問題へのループは維持
    return (
      <>
        {fromWrong && canClear && (
          <div style={{ marginTop: 8 }}>
            {cleared ? (
              <p className="cleared-note">✓ 間違えた問題一覧から消しました</p>
            ) : (
              <button
                className="choice-btn nav-btn-clear"
                disabled={clearing}
                onClick={handleClearStay}
                style={{ textAlign: "center" }}
              >
                {clearing ? "消しています..." : "間違えた問題一覧から消す"}
              </button>
            )}
          </div>
        )}
        <div className="nav-row" style={{ marginTop: 8 }}>
          {nextHref ? (
            <Link href={nextHref} className="nav-btn">
              次の問題へ →
            </Link>
          ) : (
            <span />
          )}
          <button className="nav-btn nav-btn-stop" onClick={handleStopAfter}>
            中止する
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="card">
      <p className="question-number">
        問{questionNumber} / {totalCount}問中
      </p>

      <div className="nav-row">
        {prevHref && !fromReview ? (
          <Link href={prevHref} className="nav-btn">
            ← 前の問題へ
          </Link>
        ) : (
          <span />
        )}
        {fromReview ? (
          <button className="nav-btn" onClick={handleBackToStatus}>
            学習状況へ戻る
          </button>
        ) : (
          <button className="nav-btn nav-btn-stop" onClick={handleStopBefore}>
            中止する
          </button>
        )}
        {nextHref && !fromReview && (
          <Link href={nextHref} className="nav-btn">
            次の問題へ →
          </Link>
        )}
      </div>

      <StatsBadge questionIds={sameThemeIds} label="このテーマ" />

      {(isEssay || !isListening || isAnswered) && (
        <p className="question-text">{question.question_text}</p>
      )}

      {!isEssay && isListening && !isAnswered && (
        <p className="listening-hint">音声を聞いて答えを選んでください。</p>
      )}

      {question.image_url && (
        <img
          src={question.image_url}
          alt="問題の図表"
          className={
            isEssay ? "question-image question-image-wide" : "question-image"
          }
        />
      )}

      {isEssay ? (
        <div className="result">
          {!showModelAnswer && (
            <button
              className="choice-btn"
              onClick={() => setShowModelAnswer(true)}
            >
              模範解答を見る
            </button>
          )}

          {showModelAnswer && question.model_answer && (
            <p dangerouslySetInnerHTML={{ __html: question.model_answer }} />
          )}

          {showModelAnswer && !question.model_answer && (
            <p>この問題の模範解答はまだ登録されていません。</p>
          )}

          {showModelAnswer && question.explanation && (
            <p dangerouslySetInnerHTML={{ __html: question.explanation }} />
          )}

          {showModelAnswer && renderAfterButtons()}
        </div>
      ) : (
        <>
          {displayOrder.map((origNum, idx) => {
            const displayNum = idx + 1;
            const choice = rawChoices[origNum - 1];
            let cls = "choice-btn";
            if (isAnswered) {
              if (origNum === correctNum) cls += " correct";
              else if (origNum === selected) cls += " wrong";
            } else if (origNum === selected) {
              cls += " selected";
            }
            const label =
              isListening && !isAnswered
                ? `${displayNum}`
                : `${displayNum}. ${choice}`;
            return (
              <button
                key={origNum}
                className={cls}
                disabled={isAnswered}
                onClick={() => handleSelect(origNum)}
              >
                {label}
              </button>
            );
          })}

          {isAnswered && (
            <div className="result">
              <p>
                {isCorrect
                  ? "✓ 正解！"
                  : `✗ 不正解（正解は ${displayCorrect} 番）`}
              </p>

              {remappedExplanation && !showExplanation && (
                <button
                  className="choice-btn"
                  onClick={() => setShowExplanation(true)}
                >
                  解説を見る
                </button>
              )}

              {remappedExplanation && showExplanation && (
                <p dangerouslySetInnerHTML={{ __html: remappedExplanation }} />
              )}

              {!question.explanation && (
                <p>この問題の解説はまだ登録されていません。</p>
              )}

              {question.translation && (
                <button
                  className="choice-btn"
                  onClick={() => setShowTranslation((prev) => !prev)}
                >
                  {showTranslation ? "日本語訳を閉じる" : "日本語訳を見る"}
                </button>
              )}

              {showTranslation && question.translation && (
                <p className="translation-box">{question.translation}</p>
              )}

              {renderAfterButtons()}
            </div>
          )}
        </>
      )}
    </div>
  );
}
