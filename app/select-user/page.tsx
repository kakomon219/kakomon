/**
 * ファイル: app/select-user/page.tsx
 * バージョン: v0.1
 * 更新日: 2026-07-25
 * 内容: 誰が使うか選ぶ画面。選択した名前をlocalStorageに保存してトップへ遷移
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type User = { id: number; name: string };

export default function SelectUserPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    supabase
      .from("users")
      .select("id, name")
      .then(({ data }) => {
        if (data) setUsers(data);
      });
  }, []);

  const selectUser = (user: User) => {
    localStorage.setItem("kakomon_user_id", String(user.id));
    localStorage.setItem("kakomon_user_name", user.name);
    router.push("/");
  };

  return (
    <div>
      <h1>誰が使いますか?</h1>
      {users.map((u) => (
        <button
          key={u.id}
          className="card"
          onClick={() => selectUser(u)}
          style={{ width: "100%", textAlign: "left" }}
        >
          {u.name}
        </button>
      ))}
    </div>
  );
}
