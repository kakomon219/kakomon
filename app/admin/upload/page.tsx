/**
 * ファイル: app/admin/upload/page.tsx
 * バージョン: v0.3.0
 * 更新日: 2026-08-11
 * 内容: 2枚目画像に対応。1問につき未設定の枠(1枚目/2枚目)ごとにファイル選択欄を表示し、
 *       アップロード時に slot を送る。成功後は一覧を再取得し、
 *       まだ未設定の枠が残っている問題はカードを残す。
 */

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type PendingQuestion = {
  id: string
  qualification: string
  exam_round: string
  question_no: number
  question_text: string
  image_url: string | null
  image_url2: string | null
  needs_image2: boolean | null
}

export default function UploadPage() {
  const [pending, setPending] = useState<PendingQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [error, setError] = useState("")

  const loadPending = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/pending-images")
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "一覧の取得に失敗しました")
      } else {
        setPending(data.questions)
      }
    } catch (e: any) {
      setError(e?.message || "一覧の取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPending()
  }, [])

  /** その問題で未設定の枠を返す */
  const emptySlots = (q: PendingQuestion) => {
    const slots: { slot: number; label: string }[] = []
    if (!q.image_url) slots.push({ slot: 1, label: "1枚目" })
    if (q.needs_image2 && !q.image_url2) slots.push({ slot: 2, label: "2枚目" })
    return slots
  }

  const handleUpload = (questionId: string, slot: number, file: File) => {
    const key = `${questionId}-${slot}`
    setUploadingKey(key)
    setError("")

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, fileName: file.name, questionId, slot }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || "アップロードに失敗しました")
          setUploadingKey(null)
        } else {
          setUploadingKey(null)
          await loadPending()
        }
      } catch (e: any) {
        setError(e?.message || "アップロードに失敗しました")
        setUploadingKey(null)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ padding: 24, maxWidth: 480, margin: "0 auto" }}>
      <p style={{ marginBottom: 16 }}>
        <Link href="/" style={{ fontSize: 14, color: "#666" }}>
          ← トップへ戻る
        </Link>
      </p>

      <h1 style={{ fontSize: 18, marginBottom: 16 }}>問題画像アップロード</h1>

      {loading && <p>読み込み中...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && pending.length === 0 && (
        <p style={{ color: "#666" }}>アップロードが必要な問題はありません。</p>
      )}

      {pending.map((q) => (
        <div
          key={q.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <p style={{ fontWeight: "bold", marginBottom: 4 }}>
            {q.exam_round} No.{q.question_no}
          </p>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
            {q.question_text.slice(0, 40)}...
          </p>

          {emptySlots(q).map(({ slot, label }) => (
            <div key={slot} style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 13, marginBottom: 4 }}>{label}</p>
              <input
                type="file"
                accept="image/*"
                disabled={uploadingKey === `${q.id}-${slot}`}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(q.id, slot, file)
                }}
              />
              {uploadingKey === `${q.id}-${slot}` && (
                <p style={{ fontSize: 12 }}>アップロード中...</p>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
