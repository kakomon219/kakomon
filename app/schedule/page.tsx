/**
 * app/schedule/page.tsx - 受験日程一覧画面
 * v1.0.0  2026-08-09  exam_schedulesテーブルから資格ごとの試験日程を取得し、
 *                     試験日・申込期間・状態バッジ(申込受付中/本年度申込終了等)・
 *                     公式サイト/申込ページへのリンクを表示する新規ページ
 *
 * ディレクトリ: app/schedule/page.tsx(新規)
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type ExamSchedule = {
  id: number
  qualification: string
  exam_name: string
  exam_date: string | null
  application_start: string | null
  application_end: string | null
  official_url: string | null
  application_url: string | null
  note: string | null
}

function getStatus(schedule: ExamSchedule): { label: string; color: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const examDate = schedule.exam_date ? new Date(schedule.exam_date) : null
  const appStart = schedule.application_start ? new Date(schedule.application_start) : null
  const appEnd = schedule.application_end ? new Date(schedule.application_end) : null

  if (examDate && examDate < today) {
    return { label: '本年度申込終了', color: '#9ca3af' }
  }
  if (appStart && appStart > today) {
    return { label: '申込開始前', color: '#9ca3af' }
  }
  if (appEnd && appEnd < today) {
    return { label: '申込締切済', color: '#9ca3af' }
  }
  if (appStart && appStart <= today && (!appEnd || appEnd >= today)) {
    return { label: '申込受付中', color: '#16a34a' }
  }
  return { label: '今後実施', color: '#2563eb' }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '未定'
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<ExamSchedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSchedules() {
      const { data, error } = await supabase
        .from('exam_schedules')
        .select('*')
        .order('qualification', { ascending: true })
        .order('exam_date', { ascending: true })

      if (!error && data) {
        setSchedules(data as ExamSchedule[])
      }
      setLoading(false)
    }
    fetchSchedules()
  }, [])

  const grouped = schedules.reduce((acc, s) => {
    if (!acc[s.qualification]) acc[s.qualification] = []
    acc[s.qualification].push(s)
    return acc
  }, {} as Record<string, ExamSchedule[]>)

  return (
    <div style={{ padding: '24px 16px', maxWidth: 640, margin: '0 auto' }}>
      <Link href="/" style={{ color: '#2563eb', fontSize: 14 }}>← 資格選択に戻る</Link>
      <h1 style={{ fontSize: 28, fontWeight: 'bold', margin: '16px 0 24px' }}>受験日程</h1>

      {loading && <p>読み込み中...</p>}

      {!loading && Object.entries(grouped).map(([qualification, items]) => (
        <div key={qualification} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>{qualification}</h2>
          {items.map((s) => {
            const status = getStatus(s)
            return (
              <div
                key={s.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  background: '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 'bold' }}>{s.exam_name}</span>
                  <span
                    style={{
                      fontSize: 12,
                      color: '#fff',
                      background: status.color,
                      borderRadius: 999,
                      padding: '2px 10px',
                    }}
                  >
                    {status.label}
                  </span>
                </div>
                <p style={{ margin: '4px 0', fontSize: 14 }}>試験日：{formatDate(s.exam_date)}</p>
                {(s.application_start || s.application_end) && (
                  <p style={{ margin: '4px 0', fontSize: 14, color: '#6b7280' }}>
                    申込：{formatDate(s.application_start)} 〜 {formatDate(s.application_end)}
                  </p>
                )}
                {s.note && <p style={{ margin: '4px 0', fontSize: 13, color: '#9ca3af' }}>{s.note}</p>}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {s.official_url && (
                    <a
                      href={s.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 13,
                        border: '1px solid #d1d5db',
                        borderRadius: 8,
                        padding: '6px 12px',
                        color: '#374151',
                      }}
                    >
                      公式サイト
                    </a>
                  )}
                  {s.application_url && (
                    <a
                      href={s.application_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 13,
                        border: '1px solid #2563eb',
                        borderRadius: 8,
                        padding: '6px 12px',
                        color: '#2563eb',
                      }}
                    >
                      申込ページ
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
