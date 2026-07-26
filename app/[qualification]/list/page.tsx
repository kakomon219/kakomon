/**
 * ファイル: app/[qualification]/list/page.tsx
 * バージョン: v0.3
 * 更新日: 2026-07-26
 * 内容: 「新しい問題/間違えた問題」一覧からも、絞り込み条件(exam_round/theme)をquery付きで
 *      各問題へのリンクに引き継ぐようにした(「一覧に戻る」リセット対応)
 */

"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Question = { id: number; question_no: number | null; question_text: string };

export default function FilteredListPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const qualification = params.qualification as string;
  const idsParam = searchParams.get("ids") ?? "";
  const title = searchParams.get("title") ?? "問題一覧";
  const examRound = searchParams.get("exam_round") ?? "";
  const theme = searchParams.get("theme") ?? "";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = idsParam
      .split(",")
      .map((s) => Number(s))
      .filter((n) => !Number.isNaN(n));

    if (ids.length === 0) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    supabase
      .from("questions")
      .select("id, question_no, question_text")
      .in("id", ids)
      .then(({ data }) => {
        const sorted = (data ?? []).sort((a, b) => {
          if (a.question_no != null && b.question_no != null) {
            return a.question_no - b.question_no;
          }
          return 0;
        });
        setQuestions(sorted);
        setLoading(false);
      });
  }, [idsParam]);

  const filterQs = new URLSearchParams();
  if (examRound) filterQs.set("exam_round", examRound);
  if (theme) filterQs.set("theme", theme);
  const filterQsStr = filterQs.toString();

  const backHref = `/${qualification}${filterQsStr ? `?${filterQsStr}` : ""}`;
  const questionHref = (id: number) =>
    `/${qualification}/${id}${filterQsStr ? `?${filterQsStr}` : ""}`;

  return (
    <div>
      <p>
        <Link href={backHref}>← 戻る</Link>
      </p>
      <h1>{title}</h1>
      {loading && <p>読み込み中...</p>}
      {!loading && questions.length === 0 && <p>該当する問題がありません。</p>}
      {questions.map((q) => (
        <Link key={q.id} href={questionHref(q.id)} className="card">
          {q.question_no != null ? `No.${q.question_no}` : "No.-"}{" "}
          {q.question_text.slice(0, 40)}
          {q.question_text.length > 40 ? "…" : ""}
        </Link>
      ))}
    </div>
  );
}
