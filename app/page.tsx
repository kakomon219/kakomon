/**
 * ファイル: app/page.tsx
 * バージョン: v0.4
 * 更新日: 2026-07-26
 * 内容: 画像アップロード画面へのリンクをフッターに追加
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
      <p style={{ marginTop: 32, fontSize: 12, color: "#999" }}>
        <Link href="/admin/upload" style={{ color: "#999" }}>
          画像アップロード
        </Link>
      </p>
    </div>
  );
}
