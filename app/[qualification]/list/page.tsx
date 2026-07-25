/**
 * ファイル: app/[qualification]/list/page.tsx
 * バージョン: v0.1
 * 更新日: 2026-07-26
 * 内容: 新規作成。ModeButtonsから渡されたquestion id一覧(カンマ区切り)を受け取り、
 *      その問題だけを一覧表示する汎用ページ。「新しい問題」「間違えた問題」タップ時の遷移先。
 */

"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Question = { id: number; question_text: string };

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
      .select("id, question_text")
      .in("id", ids)
      .then(({ data }) => {
        setQuestions(data ?? []);
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
      {questions.map((q, i) => (
        <Link key={q.id} href={`/${qualification}/${q.id}`} className="card">
          問{i + 1} {q.question_text.slice(0, 40)}
          {q.question_text.length > 40 ? "…" : ""}
        </Link>
      ))}
    </div>
  );
}
