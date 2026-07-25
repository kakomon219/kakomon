/**
 * ファイル: lib/supabase.ts
 * バージョン: v0.6
 * 更新日: 2026-07-25
 * 内容: Supabaseクライアントのfetchにcache: "no-store"を明示し、Next.jsのfetchキャッシュによる表示遅延を解消
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
  },
});

export type Question = {
  id: number;
  qualification: string | null;
  exam_round: string | null;
  theme: string | null;
  question_text: string;
  choice_1: string | null;
  choice_2: string | null;
  choice_3: string | null;
  choice_4: string | null;
  choice_5: string | null;
  choice_6: string | null;
  correct_answer: number | null;
  explanation: string | null;
};
