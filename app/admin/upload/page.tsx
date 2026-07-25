/**
 * app/admin/upload/page.tsx - 問題画像アップロード画面
 * v0.2.0  2026-07-26  未アップロード問題(needs_image=true かつ image_url未設定)を自動一覧表示し、
 *                     各問題ごとにファイル選択→アップロードするとその場でquestions.image_urlに紐付け保存。
 *                     トップページへの「戻る」リンクを追加。
 *
 * ディレクトリ: app/admin/upload/page.tsx(既存・上書き)
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
}

export default function UploadPage() {
  const [pending, setPending] = useState<PendingQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
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

  const handleUpload = (questionId: string, file: File) => {
    setUploadingId(questionId)
    setError("")

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, fileName: file.name, questionId }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || "アップロードに失敗しました")
        } else {
          // 成功したら一覧から即座に除去
          setPending((prev) => prev.filter((q) => q.id !== questionId))
        }
      } catch (e: any) {
        setError(e?.message || "アップロードに失敗しました")
      } finally {
        setUploadingId(null)
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
          <input
            type="file"
            accept="image/*"
            disabled={uploadingId === q.id}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(q.id, file)
            }}
          />
          {uploadingId === q.id && <p style={{ fontSize: 12 }}>アップロード中...</p>}
        </div>
      ))}
    </div>
  )
}
