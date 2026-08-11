/**
 * ファイル: app/api/upload/route.ts
 * バージョン: v0.3.0
 * 更新日: 2026-08-11
 * 内容: slot(1|2)を受け取り、1なら questions.image_url、2なら questions.image_url2 を更新する。
 *       slot未指定時は従来どおり1枚目(image_url)として扱う。
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { base64, fileName, questionId, slot } = await req.json()

    if (!base64 || !fileName || !questionId) {
      return NextResponse.json({ error: "base64・fileName・questionIdが必要です" }, { status: 400 })
    }

    const slotNum = Number(slot) === 2 ? 2 : 1
    const column = slotNum === 2 ? "image_url2" : "image_url"

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
      .update({ [column]: publicUrl })
      .eq("id", questionId)

    if (updateError) {
      return NextResponse.json({ error: `DB更新失敗(${updateError.message})`, url: publicUrl }, { status: 500 })
    }

    return NextResponse.json({ url: publicUrl, slot: slotNum })
  } catch (error: any) {
    return NextResponse.json({ error: `Upload failed(${error?.message || error})` }, { status: 500 })
  }
}
