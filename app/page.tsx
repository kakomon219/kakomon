/**
 * app/page.tsx - 資格選択画面
 * v0.5  2026-08-08  現在のユーザー名を画面上部に表示する機能を追加
 *                   (localStorageに保存されたkakomon_user_nameを表示)
 *
 * ディレクトリ: app/page.tsx(既存・上書き)
 */

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CurrentUser from "./CurrentUser";

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
      <CurrentUser />

      <h1>資格を選択</h1>

      <p>
        <Link href="/stats" className="tab">
          学習状況を見る
        </Link>
      </p>

      {qualifications.length === 0 && <p>まだ問題が登録されていません。</p>}
      {qualifications.map((q) => (
        <Link key={q} href={`/${encodeURIComponent(q)}`} className="card">
          {q}
        </Link>
      ))}

      <p style={{ marginTop: 32 }}>
        <Link href="/admin/upload" style={{ fontSize: 13, color: "#999" }}>
          画像アップロード
        </Link>
      </p>
    </div>
  );
}
