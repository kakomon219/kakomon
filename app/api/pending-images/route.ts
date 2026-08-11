/**
 * ファイル: app/api/pending-images/route.ts
 * バージョン: v0.4.0
 * 更新日: 2026-08-11
 * 内容: 2枚目画像(image_url2)に対応。needs_image=true のうち
 *       「image_url未設定」または「needs_image2=true かつ image_url2未設定」の問題を返す。
 *       どちらの枠が未設定かを画面側で判定できるよう image_url / image_url2 / needs_image2 も返す。
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
    .select(
      "id, qualification, exam_round, question_no, question_text, image_url, image_url2, needs_image2"
    )
    .eq("needs_image", true)
    .or("image_url.is.null,and(needs_image2.eq.true,image_url2.is.null)")
    .order("exam_round", { ascending: false })
    .order("question_no", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ questions: data })
}
