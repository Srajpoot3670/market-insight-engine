import { fetch } from "expo/fetch";
import { QueryClient } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export const getQueryFn =
  <T>() =>
  async ({ queryKey }: { queryKey: any[] }) => {
    const symbol = queryKey[1];
    const url = `/api/analyze/${symbol}`;

    const res = await fetch(url);

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn(),
      retry: false,
    },
  },
});
