/**
 * ファイル: app/[qualification]/[id]/page.tsx
 * バージョン: v0.9
 * 更新日: 2026-07-26
 * 内容: 前へ/次へをループさせず、最初/最後の問題では該当ボタンを出さないように変更。
 *      現在の問題番号(questionNumber)と全体数(totalCount)も算出してAnswerCardに渡す
 */

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AnswerCard from "./AnswerCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function QuestionPage({
  params,
}: {
  params: { qualification: string; id: string };
}) {
  const { data: question, error } = await supabase
    .from("questions")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !question) {
    return <p>問題が見つかりませんでした。</p>;
  }

  const { data: sameRound } = await supabase
    .from("questions")
    .select("id")
    .eq("qualification", question.qualification)
    .eq("exam_round", question.exam_round)
    .order("id", { ascending: true });

  let nextHref: string | null = null;
  let prevHref: string | null = null;
  let questionNumber = 1;
  let totalCount = 1;

  if (sameRound && sameRound.length > 0) {
    const ids = sameRound.map((q) => q.id);
    const currentIndex = ids.indexOf(question.id);
    totalCount = ids.length;
    questionNumber = currentIndex + 1;

    if (currentIndex < ids.length - 1) {
      nextHref = `/${params.qualification}/${ids[currentIndex + 1]}`;
    }
    if (currentIndex > 0) {
      prevHref = `/${params.qualification}/${ids[currentIndex - 1]}`;
    }
  }

  return (
    <div>
      <p>
        <Link href={`/${params.qualification}`}>← 一覧に戻る</Link>
      </p>
      <AnswerCard
        question={question}
        nextHref={nextHref}
        prevHref={prevHref}
        questionNumber={questionNumber}
        totalCount={totalCount}
      />
    </div>
  );
}
