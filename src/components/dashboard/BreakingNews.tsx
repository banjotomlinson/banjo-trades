"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NewsItem } from "@/lib/data";

interface DisplayNewsItem extends NewsItem {
  isNew?: boolean;
}

interface BreakingNewsProps {
  initialNews?: NewsItem[];
}

const PRIORITY_STYLE: Record<string, { label: string; cls: string }> = {
  high: { label: "HIGH", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
  medium: { label: "MED", cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  low: { label: "", cls: "" },
};

export default function BreakingNews({ initialNews }: BreakingNewsProps) {
  const hasInitial = initialNews && initialNews.length > 0;
  const [news, setNews] = useState<DisplayNewsItem[]>(
    hasInitial ? initialNews.map((n) => ({ ...n, isNew: false })) : []
  );
  const [loading, setLoading] = useState(!hasInitial);
  const [showAll, setShowAll] = useState(false);
  const seenIds = useRef(
    new Set<number>(hasInitial ? initialNews.map((n) => n.id) : [])
  );

  const fetchNews = useCallback(
    async (all: boolean) => {
      try {
        const res = await fetch(`/api/news${all ? "?all=1" : ""}`);
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
    },
    []
  );

  // Re-fetch immediately when toggling, then every 60s.
  useEffect(() => {
    fetchNews(showAll);
    const id = setInterval(() => fetchNews(showAll), 60000);
    return () => clearInterval(id);
  }, [fetchNews, showAll]);

  function timeAgo(ts: number) {
    const diff = Math.floor((Date.now() / 1000 - ts) / 60);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  }

  return (
    <div className="bg-panel border border-border rounded-xl overflow-hidden max-h-[620px] flex flex-col">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-base font-semibold text-[#f1f5f9]">Breaking News</h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-background border border-border rounded-md p-0.5">
            <button
              onClick={() => setShowAll(false)}
              className={`px-2.5 py-1 rounded-[5px] text-[11px] font-semibold transition-all ${
                !showAll ? "bg-accent text-white" : "text-muted hover:text-foreground"
              }`}
              title="Only items with macro / market relevance"
            >
              Filtered
            </button>
            <button
              onClick={() => setShowAll(true)}
              className={`px-2.5 py-1 rounded-[5px] text-[11px] font-semibold transition-all ${
                showAll ? "bg-accent text-white" : "text-muted hover:text-foreground"
              }`}
              title="Every article from the source feed"
            >
              All
            </button>
          </div>
          <span className="text-[11px] text-muted">Auto-refreshes</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-muted text-sm">Loading...</div>
        ) : news.length === 0 ? (
          <div className="p-8 text-center text-muted text-sm">
            {showAll
              ? "No news available"
              : "No high-relevance items right now. Try All to see everything."}
          </div>
        ) : (
          news.map((item) => {
            const prio = item.priority && PRIORITY_STYLE[item.priority];
            const showPrioBadge = prio && prio.label;
            return (
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
                      {showPrioBadge && (
                        <span
                          className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mr-2 uppercase border ${prio.cls}`}
                        >
                          {prio.label}
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
            );
          })
        )}
      </div>
    </div>
  );
}
