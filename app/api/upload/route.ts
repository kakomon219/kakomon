/**
 * app/api/upload/route.ts - 問題画像アップロードAPI
 * v0.1.0  2026-07-26  新規作成（question-imagesバケットへのアップロード、URLのみ返す）
 *
 * ディレクトリ: app/api/upload/route.ts（新規）
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// service role keyを使うサーバー専用クライアント（RLSを回避してアップロードするため）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { base64, fileName } = await req.json()

    if (!base64 || !fileName) {
      return NextResponse.json({ error: "base64とfileNameが必要です" }, { status: 400 })
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
      return NextResponse.json({ error: `アップロード失敗（${uploadError.message}）` }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("question-images")
      .getPublicUrl(path)

    return NextResponse.json({ url: publicUrl })
  } catch (error: any) {
    return NextResponse.json({ error: `Upload failed（${error?.message || error}）` }, { status: 500 })
  }
}
