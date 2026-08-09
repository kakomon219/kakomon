/**
 * ファイル: app/[qualification]/[id]/AnswerCard.tsx
 * バージョン: v2.7
 * 更新日: 2026-08-10
 * 内容: 選択肢シャッフル時、「該当なし」の選択肢はシャッフル対象から除外して
 *      常に最後尾に固定するよう変更(問題文「該当するものがない場合は6を選びなさい」との矛盾を解消)。
 */

"use client";

import { useState, useEffect, useMemo } from "react";
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
  questionNumber,
  totalCount,
  sameThemeIds,
  qualification,
}: {
  question: Question;
  nextHref: string | null;
  prevHref: string | null;
  questionNumber: number;
  totalCount: number;
  sameThemeIds: number[];
  qualification: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<number[]>([]);
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

  /** 問題が切り替わるたびに並びを引き直す(=解くたびにランダム) */
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

    // 「該当なし」はシャッフルせず最後尾に固定
    const fixedNums = validNums.filter((n) => isNoneOption(choices[n - 1]));
    const shuffleNums = validNums.filter((n) => !isNoneOption(choices[n - 1]));

    setDisplayOrder([...shuffle(shuffleNums), ...fixedNums]);
    setSelected(null);
    setShowExplanation(false);
    setShowTranslation(false);
    setShowModelAnswer(false);
  }, [
    question.id,
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

  /** explanation内の丸数字を今回の表示順に付け替える */
  const remappedExplanation = useMemo(() => {
    if (!question.explanation || displayOrder.length === 0) {
      return question.explanation;
    }
    return question.explanation.replace(/[①②③④⑤⑥]/g, (mark) => {
      const origNum = CIRCLED.indexOf(mark) + 1;
      const newNum = origToDisplay.get(origNum);
      return newNum ? CIRCLED[newNum - 1] : mark;
    });
  }, [question.explanation, origToDisplay, displayOrder.length]);

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

  return (
    <div className="card">
      <p className="question-number">
        問{questionNumber} / {totalCount}問中
      </p>

      <div className="nav-row">
        {prevHref ? (
          <Link href={prevHref} className="nav-btn">
            ← 前の問題へ
          </Link>
        ) : (
          <span />
        )}
        <Link href={`/${qualification}`} className="nav-btn nav-btn-stop">
          中止する
        </Link>
        {nextHref && (
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

          {showModelAnswer && nextHref && (
            <Link href={nextHref} className="choice-btn">
              次の問題へ →
            </Link>
          )}
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

              {nextHref && (
                <Link href={nextHref} className="choice-btn">
                  次の問題へ →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
