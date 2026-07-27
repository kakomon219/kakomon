/**
 * ファイル: app/page.tsx
 * バージョン: v0.5
 * 更新日: 2026-07-28
 * 内容: 学習状況ページ(全資格分)へのリンクを追加
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

      <p>
        <Link href="/learning-status" className="nav-btn">
          学習状況を見る
        </Link>
      </p>

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
