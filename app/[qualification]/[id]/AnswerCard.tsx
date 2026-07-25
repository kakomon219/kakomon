/**
 * ファイル: app/[qualification]/[id]/AnswerCard.tsx
 * バージョン: v1.3
 * 更新日: 2026-07-26
 * 内容: リスニング問題(theme が「リスニング」で始まる場合)は解答前にquestion_text(スクリプト)を隠し、
 *      音声プレーヤーと選択肢のみ表示。解答後は「スクリプトを見る」ボタンで開閉できるようにした
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
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
  const [showScript, setShowScript] = useState(false);

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
  const isListening = question.theme?.startsWith("リスニング") ?? false;

  const handleSelect = async (num: number) => {
    setSelected(num);

    const userId = localStorage.getItem("kakomon_user_id");
    if (!userId) return; // ユーザー未選択時は記録しない

    // 記録の成否は画面表示に影響させない(失敗してもUXを止めない)
    await supabase.from("attempts").insert({
      user_id: Number(userId),
      question_id: question.id,
      selected_answer: num,
      is_correct: num === question.correct_answer,
      answered_at: new Date().toISOString(),
    });
  };

  return (
    <div className="card">
      {question.audio_url && (
        <audio controls preload="none" src={question.audio_url} className="audio-player">
          お使いのブラウザは音声再生に対応していません。
        </audio>
      )}

      {(!isListening || isAnswered) && <p>{question.question_text}</p>}

      {isListening && !isAnswered && (
        <p className="listening-hint">音声を聞いて答えを選んでください。</p>
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
            onClick={() => handleSelect(num)}
          >
            {num}. {choice}
          </button>
        );
      })}

      {isAnswered && (
        <div className="result">
          <p>{isCorrect ? "✓ 正解！" : "✗ 不正解"}</p>

          {isListening && !showScript && (
            <button className="choice-btn" onClick={() => setShowScript(true)}>
              スクリプトを見る
            </button>
          )}

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
    </div>
  );
}
