/**
 * ファイル: app/[qualification]/[id]/AnswerCard.tsx
 * バージョン: v0.7
 * 更新日: 2026-07-25
 * 内容: 解説文をHTML(rubyタグでのふりがな表示)として描画できるよう変更
 */

"use client";

import { useState } from "react";
import type { Question } from "@/lib/supabase";

export default function AnswerCard({ question }: { question: Question }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

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
        </div>
      )}
    </div>
  );
}
