import { QueryClient } from "@tanstack/react-query";

/** Global TanStack Query client with sensible defaults for Festosh. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /** Keep data fresh for 30 seconds before refetching. */
      staleTime: 30 * 1000,
      /** Cache unused data for 5 minutes before garbage collection. */
      gcTime: 5 * 60 * 1000,
      /** Retry failed queries up to 2 times. */
      retry: 2,
      /** Refetch on window focus for fresh data. */
      refetchOnWindowFocus: true,
      /** Do not refetch on reconnect by default (let staleTime handle it). */
      refetchOnReconnect: "always",
    },
    mutations: {
      /** Do not retry mutations by default. */
      retry: false,
    },
  },
});
