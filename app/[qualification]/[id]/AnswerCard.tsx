/**
 * ファイル: app/[qualification]/[id]/page.tsx
 * バージョン: v0.6
 * 更新日: 2026-07-25
 * 内容: revalidate=0を追加し、questionsのデータキャッシュを無効化(解説が反映されない問題の対策)
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

  return (
    <div>
      <p>
        <Link href={`/${params.qualification}`}>← 一覧に戻る</Link>
      </p>
      <AnswerCard question={question} />
    </div>
  );
}
