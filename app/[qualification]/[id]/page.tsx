/**
 * ファイル: app/[qualification]/[id]/page.tsx
 * バージョン: v1.0
 * 更新日: 2026-07-26
 * 内容: 前へ/次へ・問題番号の範囲をexam_round全体からtheme単位(同じthemeの中だけ)に変更
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

  const { data: sameTheme } = await supabase
    .from("questions")
    .select("id")
    .eq("qualification", question.qualification)
    .eq("exam_round", question.exam_round)
    .eq("theme", question.theme)
    .order("id", { ascending: true });

  let nextHref: string | null = null;
  let prevHref: string | null = null;
  let questionNumber = 1;
  let totalCount = 1;

  if (sameTheme && sameTheme.length > 0) {
    const ids = sameTheme.map((q) => q.id);
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
