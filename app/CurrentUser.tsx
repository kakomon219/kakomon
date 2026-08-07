/**
 * ファイル: app/CurrentUser.tsx
 * バージョン: v0.1
 * 更新日: 2026-08-08
 * 内容: 現在のユーザー名をlocalStorageから読み取り「〇〇として学習中」と表示。
 *       未選択時は警告色で表示し、切替リンクを併設(新規作成)
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CurrentUser() {
  const [userName, setUserName] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setUserName(localStorage.getItem("kakomon_user_name"));
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: userName ? "#e8f5e9" : "#fff3e0",
        border: `1px solid ${userName ? "#a5d6a7" : "#ffcc80"}`,
        borderRadius: 8,
        padding: "10px 14px",
        marginBottom: 16,
      }}
    >
      <span style={{ fontSize: 15, fontWeight: "bold" }}>
        {userName ? `${userName} として学習中` : "ユーザーが未選択です"}
      </span>
      <Link href="/select-user" style={{ fontSize: 13, color: "#1565c0" }}>
        切り替える
      </Link>
    </div>
  );
}
