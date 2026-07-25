/**
 * app/api/pending-images/route.ts - image_url未設定の問題一覧を返すAPI
 * v0.1.0  2026-07-26  新規作成
 *
 * ディレクトリ: app/api/pending-images/route.ts(新規)
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("questions")
    .select("id, qualification, exam_round, question_no, question_text")
    .is("image_url", null)
    .not("question_no", "is", null)
    .order("exam_round", { ascending: false })
    .order("question_no", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ questions: data })
}
