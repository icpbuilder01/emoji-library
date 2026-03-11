import { Toaster } from "@/components/ui/sonner";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Emoji } from "./backend.d";
import { useActor } from "./hooks/useActor";

// ─── Hooks ──────────────────────────────────────────────────────────────────

function useCategories() {
  const { actor, isFetching } = useActor();
  return useQuery<string[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCategories();
    },
    enabled: !!actor && !isFetching,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

function useAllEmojis(categories: string[], enabled: boolean) {
  const { actor, isFetching } = useActor();
  return useQuery<Record<string, Emoji[]>>({
    queryKey: ["allEmojis", categories],
    queryFn: async () => {
      if (!actor || categories.length === 0) return {};
      const results = await Promise.all(
        categories.map((cat) =>
          actor.getEmojisByCategory(cat).then((emojis) => ({ cat, emojis })),
        ),
      );
      return Object.fromEntries(
        results.map(({ cat, emojis }) => [cat, emojis]),
      );
    },
    enabled: !!actor && !isFetching && enabled && categories.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

function useSearchEmojis(queryText: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Emoji[]>({
    queryKey: ["search", queryText],
    queryFn: async () => {
      if (!actor || !queryText.trim()) return [];
      return actor.searchEmojis(queryText.trim());
    },
    enabled: !!actor && !isFetching && queryText.trim().length > 0,
    staleTime: 30_000,
  });
}

// ─── Emoji Tile ──────────────────────────────────────────────────────────────

function EmojiTile({
  emoji,
  index,
  onCopy,
}: {
  emoji: Emoji;
  index: number;
  onCopy: (e: Emoji) => void;
}) {
  return (
    <button
      type="button"
      className="emoji-tile"
      onClick={() => onCopy(emoji)}
      title={emoji.name}
      aria-label={`Copy ${emoji.name}`}
      data-ocid={`emoji.item.${index}`}
    >
      {emoji.emoji}
    </button>
  );
}

// ─── Category Section ────────────────────────────────────────────────────────

function CategorySection({
  category,
  emojis,
  onCopy,
  startIndex,
}: {
  category: string;
  emojis: Emoji[];
  onCopy: (e: Emoji) => void;
  startIndex: number;
}) {
  return (
    <section className="category-section mb-2 pt-5">
      {/* Fix 2: Anchored header with count badge */}
      <div className="flex items-baseline gap-2 mb-2.5">
        <h2 className="text-xs font-semibold tracking-[0.15em] uppercase text-foreground">
          {category}
        </h2>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {emojis.length}
        </span>
      </div>
      {/* Fix 1: gap-px for tight, dense grid */}
      <div className="flex flex-wrap gap-px">
        {emojis.map((emoji, i) => (
          <EmojiTile
            key={emoji.name}
            emoji={emoji}
            index={startIndex + i + 1}
            onCopy={onCopy}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

const SKELETON_ROWS = [
  { id: "sk-a", count: 32 },
  { id: "sk-b", count: 28 },
  { id: "sk-c", count: 36 },
  { id: "sk-d", count: 24 },
  { id: "sk-e", count: 30 },
];

const SKELETON_CELLS: Record<string, { id: string; delay: number }[]> = {};
for (const row of SKELETON_ROWS) {
  SKELETON_CELLS[row.id] = Array.from({ length: row.count }, (_, i) => ({
    id: `${row.id}-cell-${i}`,
    delay: (i * 20) % 600,
  }));
}

function LoadingSkeleton() {
  return (
    <div
      className="flex flex-col gap-8 mt-6"
      data-ocid="app.loading_state"
      aria-label="Loading emojis..."
    >
      {SKELETON_ROWS.map((row) => (
        <div key={row.id} className="mb-6">
          <div className="h-3 w-28 bg-accent rounded mb-4 animate-pulse" />
          <div className="flex flex-wrap gap-px">
            {SKELETON_CELLS[row.id].map((cell) => (
              <div
                key={cell.id}
                className="w-12 h-12 rounded-lg bg-accent animate-pulse"
                style={{ animationDelay: `${cell.delay}ms` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Search Results ──────────────────────────────────────────────────────────

function SearchResults({
  query,
  onCopy,
}: {
  query: string;
  onCopy: (e: Emoji) => void;
}) {
  const { data: results, isLoading } = useSearchEmojis(query);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12" data-ocid="app.loading_state">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-16" data-ocid="emoji.empty_state">
        <p className="text-4xl mb-3">🔍</p>
        <p className="text-muted-foreground text-sm">
          No emojis found for "{query}"
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-4 px-1">
        {results.length} result{results.length !== 1 ? "s" : ""}
      </p>
      <div className="flex flex-wrap gap-px">
        {results.map((emoji, i) => (
          <EmojiTile
            key={emoji.name}
            emoji={emoji}
            index={i + 1}
            onCopy={onCopy}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: categories, isLoading: catsLoading } = useCategories();
  const { data: emojisByCategory, isLoading: emojisLoading } = useAllEmojis(
    categories ?? [],
    !!categories && categories.length > 0,
  );

  const isLoading = catsLoading || emojisLoading;
  const isSearching = search.trim().length > 0;

  // Compute global emoji count for the subtitle
  const totalEmojis = useMemo(() => {
    if (!emojisByCategory) return null;
    return Object.values(emojisByCategory).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
  }, [emojisByCategory]);

  // Compute running start index per category for deterministic markers
  const categoryStartIndices = useMemo(() => {
    if (!emojisByCategory || !categories) return {};
    const indices: Record<string, number> = {};
    let running = 0;
    for (const cat of categories) {
      indices[cat] = running;
      running += emojisByCategory[cat]?.length ?? 0;
    }
    return indices;
  }, [emojisByCategory, categories]);

  const handleCopy = useCallback(async (emoji: Emoji) => {
    try {
      await navigator.clipboard.writeText(emoji.emoji);
      toast.success(`Copied ${emoji.emoji}`, {
        duration: 1500,
        id: "copy-toast",
      });
    } catch {
      // Fallback for environments without clipboard API
      const textarea = document.createElement("textarea");
      textarea.value = emoji.emoji;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success(`Copied ${emoji.emoji}`, {
        duration: 1500,
        id: "copy-toast",
      });
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearch("");
    searchInputRef.current?.focus();
  }, []);

  // Scroll to top when search starts/stops
  // biome-ignore lint/correctness/useExhaustiveDependencies: isSearching is intentionally the trigger
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [isSearching]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-4">
          {/* Title row */}
          <div className="flex items-baseline gap-3 mb-4">
            <h1 className="text-lg font-semibold tracking-tight text-foreground leading-none">
              Emoji Library
            </h1>
            {totalEmojis != null && !isLoading && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {totalEmojis.toLocaleString()}
              </span>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <Search size={16} strokeWidth={2} />
            </span>
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Search emojis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
                search-input w-full h-11 pl-9 pr-10
                bg-accent text-foreground
                rounded-xl border border-border
                text-sm font-normal
                outline-none
                focus:border-ring focus:ring-1 focus:ring-ring/30
                transition-all duration-150
                placeholder:text-muted-foreground
              "
              data-ocid="search.search_input"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <AnimatePresence>
              {search && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.1 }}
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X size={15} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {isLoading ? (
          <LoadingSkeleton />
        ) : isSearching ? (
          <AnimatePresence mode="wait">
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <SearchResults query={search} onCopy={handleCopy} />
            </motion.div>
          </AnimatePresence>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key="browse"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {categories && emojisByCategory ? (
                categories.map((category) => {
                  const emojis = emojisByCategory[category];
                  if (!emojis || emojis.length === 0) return null;
                  return (
                    <CategorySection
                      key={category}
                      category={category}
                      emojis={emojis}
                      onCopy={handleCopy}
                      startIndex={categoryStartIndices[category] ?? 0}
                    />
                  );
                })
              ) : (
                <div className="text-center py-20 text-muted-foreground text-sm">
                  No emojis available
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-5 px-4 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with{" "}
          <span aria-label="love">♥</span> using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </footer>

      {/* ── Toaster ── */}
      <Toaster
        position="bottom-center"
        toastOptions={{
          className:
            "!bg-card !border !border-border !text-foreground !text-sm !rounded-xl !shadow-lg",
        }}
        data-ocid="copy.toast"
      />
    </div>
  );
}
