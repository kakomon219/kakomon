/**
 * ファイル: app/[qualification]/list/page.tsx
 * バージョン: v0.2
 * 更新日: 2026-07-26
 * 内容: 一覧表示のラベルを「問{i+1}」(表示順)から「No.{question_no}」(本来の問題番号)に変更
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

  return (
    <div>
      <p>
        <Link href={`/${qualification}`}>← 戻る</Link>
      </p>
      <h1>{title}</h1>
      {loading && <p>読み込み中...</p>}
      {!loading && questions.length === 0 && <p>該当する問題がありません。</p>}
      {questions.map((q) => (
        <Link key={q.id} href={`/${qualification}/${q.id}`} className="card">
          {q.question_no != null ? `No.${q.question_no}` : "No.-"}{" "}
          {q.question_text.slice(0, 40)}
          {q.question_text.length > 40 ? "…" : ""}
        </Link>
      ))}
    </div>
  );
}
