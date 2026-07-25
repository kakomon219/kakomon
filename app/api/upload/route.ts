/**
 * app/api/upload/route.ts - 問題画像アップロードAPI
 * v0.2.0  2026-07-26  questionIdを受け取り、アップロードと同時にquestions.image_urlをUPDATEする処理を追加
 *
 * ディレクトリ: app/api/upload/route.ts(既存・上書き)
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { base64, fileName, questionId } = await req.json()

    if (!base64 || !fileName || !questionId) {
      return NextResponse.json({ error: "base64・fileName・questionIdが必要です" }, { status: 400 })
    }

    const match = base64.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) {
      return NextResponse.json({ error: "base64の形式が不正です" }, { status: 400 })
    }
    const contentType = match[1]
    const buffer = Buffer.from(match[2], "base64")

    const ext = fileName.split(".").pop() || "png"
    const path = `questions/${Date.now()}.${ext}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from("question-images")
      .upload(path, buffer, { contentType, upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: `アップロード失敗(${uploadError.message})` }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("question-images")
      .getPublicUrl(path)

    const { error: updateError } = await supabaseAdmin
      .from("questions")
      .update({ image_url: publicUrl })
      .eq("id", questionId)

    if (updateError) {
      return NextResponse.json({ error: `DB更新失敗(${updateError.message})`, url: publicUrl }, { status: 500 })
    }

    return NextResponse.json({ url: publicUrl })
  } catch (error: any) {
    return NextResponse.json({ error: `Upload failed(${error?.message || error})` }, { status: 500 })
  }
}
