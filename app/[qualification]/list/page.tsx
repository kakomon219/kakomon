/**
 * ファイル: app/[qualification]/list/page.tsx
 * バージョン: v0.4
 * 更新日: 2026-07-26
 * 内容: 一覧のプレビュー表示で、themeが「リスニング」で始まる問題は question_text を隠し、
 *      「🎧 音声問題」のような表示に差し替え(答えが見えてしまうバグの修正)
 */

"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Question = {
  id: number;
  question_no: number | null;
  question_text: string;
  theme: string | null;
};

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
      .select("id, question_no, question_text, theme")
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

  const previewLabel = (t: string | null, text: string) => {
    if (t?.startsWith("リスニング")) {
      return "🎧 音声問題";
    }
    return `${text.slice(0, 40)}${text.length > 40 ? "…" : ""}`;
  };

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
          {previewLabel(q.theme, q.question_text)}
        </Link>
      ))}
    </div>
  );
}
