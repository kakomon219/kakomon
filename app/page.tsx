/**
 * ファイル: app/page.tsx
 * バージョン: v0.3
 * 更新日: 2026-07-25
 * 内容: revalidate=0に加え、ユーザー切替リンクを追加
 */

import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const { data, error } = await supabase
    .from("questions")
    .select("qualification");

  if (error) {
    return <p>読み込みエラー: {error.message}</p>;
  }

  const qualifications = Array.from(
    new Set((data ?? []).map((q) => q.qualification).filter(Boolean))
  ) as string[];

  return (
    <div>
      <p>
        <Link href="/select-user">ユーザーを切り替える</Link>
      </p>
      <h1>資格を選択</h1>
      {qualifications.length === 0 && <p>まだ問題が登録されていません。</p>}
      {qualifications.map((q) => (
        <Link key={q} href={`/${encodeURIComponent(q)}`} className="card">
          {q}
        </Link>
      ))}
    </div>
  );
}
