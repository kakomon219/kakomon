/**
 * ファイル: app/[qualification]/[id]/page.tsx
 * バージョン: v1.2
 * 更新日: 2026-07-26
 * 内容: AnswerCardにsameThemeIds(同じtheme内の全question id)を渡し、
 *      解答画面でそのテーマの回答数・正解数・誤答数を表示できるようにした
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

  const filterQs = new URLSearchParams();
  if (searchParams.exam_round) filterQs.set("exam_round", searchParams.exam_round);
  if (searchParams.theme) filterQs.set("theme", searchParams.theme);
  const filterQsStr = filterQs.toString();
  const withFilter = (path: string) => `${path}${filterQsStr ? `?${filterQsStr}` : ""}`;

  let nextHref: string | null = null;
  let prevHref: string | null = null;
  let questionNumber = 1;
  let totalCount = 1;
  const sameThemeIds = (sameTheme ?? []).map((q) => q.id);

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
        sameThemeIds={sameThemeIds}
      />
    </div>
  );
}
