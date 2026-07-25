import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

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
