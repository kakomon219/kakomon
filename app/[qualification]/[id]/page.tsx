import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AnswerCard from "./AnswerCard";

export const dynamic = "force-dynamic";

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
