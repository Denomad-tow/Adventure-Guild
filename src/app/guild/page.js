"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { formatRelativeTime } from "@/lib/format";

const reactionEmojis = ["👏", "😂", "😭", "🔥"];
const NEWS_LIMIT = 30;

export default function GuildPage() {
  const { character } = useAuth();
  const [news, setNews] = useState([]);
  const [reactionsByNews, setReactionsByNews] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    const { data: newsData } = await supabase
      .from("guild_news")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(NEWS_LIMIT);

    const items = newsData ?? [];
    setNews(items);

    if (items.length > 0) {
      const { data: reactionData } = await supabase
        .from("guild_news_reactions")
        .select("*")
        .in("news_id", items.map((n) => n.id));

      const grouped = {};
      for (const reaction of reactionData ?? []) {
        if (!grouped[reaction.news_id]) grouped[reaction.news_id] = [];
        grouped[reaction.news_id].push(reaction);
      }
      setReactionsByNews(grouped);
    } else {
      setReactionsByNews({});
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFeed();
  }, [loadFeed]);

  async function handleReact(newsId, emoji) {
    if (!character || busyKey) return;
    const key = `${newsId}-${emoji}`;
    setBusyKey(key);

    const existing = (reactionsByNews[newsId] ?? []).find((r) => r.user_id === character.user_id);

    if (existing && existing.emoji === emoji) {
      await supabase.from("guild_news_reactions").delete().eq("id", existing.id);
    } else if (existing) {
      await supabase.from("guild_news_reactions").update({ emoji }).eq("id", existing.id);
    } else {
      await supabase.from("guild_news_reactions").insert({
        news_id: newsId,
        user_id: character.user_id,
        emoji,
      });
    }

    await loadFeed();
    setBusyKey(null);
  }

  return (
    <div className="flex flex-col gap-4 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-zinc-950 dark:text-white">길드 소식</h1>
        <button
          type="button"
          onClick={loadFeed}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
        >
          새로고침
        </button>
      </div>

      {loading ? (
        <p className="text-center text-sm text-zinc-400">불러오는 중...</p>
      ) : news.length === 0 ? (
        <p className="text-center text-sm text-zinc-400">
          아직 소식이 없습니다. 지역을 개척하거나 전설 장비를 얻으면 여기 올라와요.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {news.map((item) => {
            const reactions = reactionsByNews[item.id] ?? [];
            const myReaction = character
              ? reactions.find((r) => r.user_id === character.user_id)?.emoji
              : null;
            const counts = {};
            for (const r of reactions) {
              counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
            }

            return (
              <div
                key={item.id}
                className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <p className="text-sm text-zinc-950 dark:text-white">{item.message}</p>
                <p className="mt-1 text-xs text-zinc-400">{formatRelativeTime(item.created_at)}</p>

                <div className="mt-3 flex gap-1.5">
                  {reactionEmojis.map((emoji) => {
                    const count = counts[emoji] ?? 0;
                    const isMine = myReaction === emoji;
                    const key = `${item.id}-${emoji}`;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleReact(item.id, emoji)}
                        disabled={busyKey === key}
                        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs disabled:opacity-40 ${
                          isMine
                            ? "border-zinc-950 bg-zinc-100 dark:border-white dark:bg-zinc-800"
                            : "border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        <span>{emoji}</span>
                        {count > 0 && <span className="text-zinc-500 dark:text-zinc-400">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
        월드 보스, 길드 마을, 용병, 파견, 랭킹은 다음 단계들에서 추가될 예정입니다.
      </p>
    </div>
  );
}
