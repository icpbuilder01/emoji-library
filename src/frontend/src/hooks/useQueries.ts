import { useQuery } from "@tanstack/react-query";
import type { Emoji } from "../backend.d";
import { useActor } from "./useActor";

// Fetch all categories
export function useCategories() {
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

// Fetch emojis for a specific category
export function useEmojisByCategory(category: string, enabled: boolean) {
  const { actor, isFetching } = useActor();
  return useQuery<Emoji[]>({
    queryKey: ["emojis", category],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getEmojisByCategory(category);
    },
    enabled: !!actor && !isFetching && enabled && category.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

// Search emojis
export function useSearchEmojis(queryText: string) {
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
