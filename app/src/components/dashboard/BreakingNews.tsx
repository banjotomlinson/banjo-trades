"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NewsItem } from "@/lib/data";

interface DisplayNewsItem extends NewsItem {
  isNew?: boolean;
}

interface BreakingNewsProps {
  initialNews?: NewsItem[];
}

export default function BreakingNews({ initialNews }: BreakingNewsProps) {
  const hasInitial = initialNews && initialNews.length > 0;
  const [news, setNews] = useState<DisplayNewsItem[]>(
    hasInitial ? initialNews.map((n) => ({ ...n, isNew: false })) : []
  );
  const [loading, setLoading] = useState(!hasInitial);
  const seenIds = useRef(
    new Set<number>(hasInitial ? initialNews.map((n) => n.id) : [])
  );

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch("/api/news");
      if (!res.ok) return;
      const data = await res.json();
      const items: DisplayNewsItem[] = (data.news || []).map(
        (n: NewsItem) => ({
          ...n,
          isNew: !seenIds.current.has(n.id),
        })
      );
      items.forEach((n) => seenIds.current.add(n.id));
      setNews(items);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(fetchNews, 60000);
    return () => clearInterval(id);
  }, [fetchNews]);

  function timeAgo(ts: number) {
    const diff = Math.floor((Date.now() / 1000 - ts) / 60);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  }

  return (
    <div className="bg-panel border border-border rounded-xl overflow-hidden max-h-[620px] flex flex-col">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#f1f5f9]">
          Breaking News
        </h2>
        <span className="text-xs text-muted">Auto-refreshes</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-muted text-sm">Loading...</div>
        ) : news.length === 0 ? (
          <div className="p-8 text-center text-muted text-sm">
            No news available
          </div>
        ) : (
          news.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-5 py-3.5 border-b border-border/50 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">
                    {item.isNew && (
                      <span className="inline-block text-[10px] font-bold bg-accent text-white px-1.5 py-0.5 rounded mr-2 uppercase">
                        New
                      </span>
                    )}
                    {item.headline}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] font-semibold text-accent/80">
                      {item.source}
                    </span>
                    <span className="text-[11px] text-muted">
                      {timeAgo(item.datetime)}
                    </span>
                  </div>
                </div>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
