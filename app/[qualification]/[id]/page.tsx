/**
 * ファイル: app/[qualification]/[id]/page.tsx
 * バージョン: v0.7
 * 更新日: 2026-07-25
 * 内容: 同じexam_round(級)内で次の問題へループするnextHrefを算出してAnswerCardに渡す
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
  if (sameRound && sameRound.length > 0) {
    const ids = sameRound.map((q) => q.id);
    const currentIndex = ids.indexOf(question.id);
    const nextIndex = (currentIndex + 1) % ids.length;
    const nextId = ids[nextIndex];
    nextHref = `/${params.qualification}/${nextId}`;
  }

  return (
    <div>
      <p>
        <Link href={`/${params.qualification}`}>← 一覧に戻る</Link>
      </p>
      <AnswerCard question={question} nextHref={nextHref} />
    </div>
  );
}
