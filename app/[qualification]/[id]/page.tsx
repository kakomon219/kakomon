/**
 * ファイル: app/[qualification]/[id]/page.tsx
 * バージョン: v1.3
 * 更新日: 2026-08-10
 * 内容: URLにidsパラメータ(新しい問題/続きの問題/間違えた問題で絞り込んだid列)がある場合、
 *      そのidリストの中だけで次・前・問題番号・全体数を計算し、一問一答形式でループできるようにした。
 *      idsが無い場合は従来通りtheme内ループ。
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
  searchParams: { exam_round?: string; theme?: string; ids?: string };
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
  if (searchParams.ids) filterQs.set("ids", searchParams.ids);
  const filterQsStr = filterQs.toString();
  const withFilter = (path: string) => `${path}${filterQsStr ? `?${filterQsStr}` : ""}`;

  let nextHref: string | null = null;
  let prevHref: string | null = null;
  let questionNumber = 1;
  let totalCount = 1;
  const sameThemeIds = (sameTheme ?? []).map((q) => q.id);

  const modeIds = searchParams.ids
    ? searchParams.ids
        .split(",")
        .map((s) => Number(s))
        .filter((n) => !Number.isNaN(n))
    : null;

  if (modeIds && modeIds.length > 0) {
    const currentIndex = modeIds.indexOf(question.id);
    totalCount = modeIds.length;
    questionNumber = currentIndex + 1;

    if (currentIndex !== -1 && currentIndex < modeIds.length - 1) {
      nextHref = withFilter(`/${params.qualification}/${modeIds[currentIndex + 1]}`);
    }
    if (currentIndex > 0) {
      prevHref = withFilter(`/${params.qualification}/${modeIds[currentIndex - 1]}`);
    }
  } else if (sameTheme && sameTheme.length > 0) {
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
