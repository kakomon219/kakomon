/**
 * ファイル: app/[qualification]/[id]/AnswerCard.tsx
 * バージョン: v0.9
 * 更新日: 2026-07-25
 * 内容: 「日本語訳を見る」ボタンを追加(タップで開閉、正誤に関わらずいつでも見られる)
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import type { Question } from "@/lib/supabase";

export default function AnswerCard({
  question,
  nextHref,
}: {
  question: Question;
  nextHref: string | null;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const choices = [
    question.choice_1,
    question.choice_2,
    question.choice_3,
    question.choice_4,
    question.choice_5,
    question.choice_6,
  ];

  const isAnswered = selected !== null;
  const isCorrect = selected === question.correct_answer;

  return (
    <div className="card">
      <p>{question.question_text}</p>

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

      {choices.map((choice, i) => {
        if (!choice) return null;
        const num = i + 1;
        let cls = "choice-btn";
        if (isAnswered) {
          if (num === question.correct_answer) cls += " correct";
          else if (num === selected) cls += " wrong";
        } else if (num === selected) {
          cls += " selected";
        }
        return (
          <button
            key={num}
            className={cls}
            disabled={isAnswered}
            onClick={() => setSelected(num)}
          >
            {num}. {choice}
          </button>
        );
      })}

      {isAnswered && (
        <div className="result">
          <p>{isCorrect ? "✓ 正解！" : "✗ 不正解"}</p>

          {question.explanation && !showExplanation && (
            <button
              className="choice-btn"
              onClick={() => setShowExplanation(true)}
            >
              解説を見る
            </button>
          )}

          {question.explanation && showExplanation && (
            <p
              dangerouslySetInnerHTML={{ __html: question.explanation }}
            />
          )}

          {!question.explanation && (
            <p>この問題の解説はまだ登録されていません。</p>
          )}

          {nextHref && (
            <Link href={nextHref} className="choice-btn">
              次の問題へ →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
