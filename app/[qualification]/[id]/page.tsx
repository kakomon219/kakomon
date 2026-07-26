/**
 * ファイル: app/[qualification]/[id]/page.tsx
 * バージョン: v1.1
 * 更新日: 2026-07-26
 * 内容: 「一覧に戻る」リンクが常に絞り込みなしにリセットされていたバグを修正。
 *      URLのexam_round/theme(searchParams)を読み取り、戻るリンク・次へ/前へリンクに引き継ぐ
 */

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AnswerCard from "./AnswerCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function QuestionPage({
  params,
  searchParams,
}: {
  params: { qualification: string; id: string };
  searchParams: { exam_round?: string; theme?: string };
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

  // 現在の絞り込み条件(級・回/テーマ)をquery文字列化し、戻る・次へ/前へに引き継ぐ
  const filterQs = new URLSearchParams();
  if (searchParams.exam_round) filterQs.set("exam_round", searchParams.exam_round);
  if (searchParams.theme) filterQs.set("theme", searchParams.theme);
  const filterQsStr = filterQs.toString();
  const withFilter = (path: string) => `${path}${filterQsStr ? `?${filterQsStr}` : ""}`;

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
      nextHref = withFilter(`/${params.qualification}/${ids[currentIndex + 1]}`);
    }
    if (currentIndex > 0) {
      prevHref = withFilter(`/${params.qualification}/${ids[currentIndex - 1]}`);
    }
  }

  return (
    <div>
      <p>
        <Link href={withFilter(`/${params.qualification}`)}>← 一覧に戻る</Link>
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
