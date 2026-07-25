/**
 * app/admin/upload/page.tsx - 問題画像アップロード画面
 * v0.1.0  2026-07-26  新規作成（ファイル選択→アップロード→公開URL表示のシンプル画面）
 *
 * ディレクトリ: app/admin/upload/page.tsx（新規）
 */

"use client"

import { useState } from "react"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError("")
    setUrl("")

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, fileName: file.name }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || "アップロードに失敗しました")
        } else {
          setUrl(data.url)
        }
      } catch (e: any) {
        setError(e?.message || "アップロードに失敗しました")
      } finally {
        setLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ padding: 24, maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontSize: 18, marginBottom: 16 }}>問題画像アップロード</h1>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        style={{ marginBottom: 12 }}
      />

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        style={{
          display: "block",
          padding: "8px 16px",
          marginTop: 8,
          marginBottom: 16,
        }}
      >
        {loading ? "アップロード中..." : "アップロード"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {url && (
        <div>
          <p style={{ fontSize: 12, color: "#666" }}>公開URL（タップして全選択→コピー）</p>
          <input
            type="text"
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            style={{ width: "100%", padding: 8, fontSize: 13 }}
          />
        </div>
      )}
    </div>
  )
}
