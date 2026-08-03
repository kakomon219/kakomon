/**
 * app/api/pending-images/route.ts - 画像アップロードが必要な問題一覧を返すAPI
 * v0.3.0  2026-08-03  dynamic/revalidate指定を追加し、ビルド時キャッシュによる
 *                     「常に空リストが返る」不具合を解消
 *
 * ディレクトリ: app/api/pending-images/route.ts(既存・上書き)
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const revalidate = 0

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("questions")
    .select("id, qualification, exam_round, question_no, question_text")
    .eq("needs_image", true)
    .is("image_url", null)
    .order("exam_round", { ascending: false })
    .order("question_no", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ questions: data })
}
