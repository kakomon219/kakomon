/**
 * ファイル: app/page.tsx
 * バージョン: v0.2
 * 更新日: 2026-07-25
 * 内容: revalidate=0を追加し、資格一覧のデータキャッシュを無効化(新しい資格が反映されない問題の対策)
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
