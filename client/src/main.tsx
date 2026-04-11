import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import { supabase } from "@/integrations/supabase/client";
import { ThemeProvider } from "@/components/theme-provider";
import "./index.css";

const queryClient = new QueryClient();

function readCookieToken(): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie?.split(";") ?? [];
  for (const raw of cookies) {
    const [k, v] = raw.split("=").map(s => s.trim());
    if (!k || !v) continue;
    // supabase costuma usar sb-<ref>-auth-token
    if (k.includes("sb-") && k.includes("auth-token")) {
      try {
        const parsed = JSON.parse(decodeURIComponent(v));
        const token =
          parsed?.access_token ||
          parsed?.currentSession?.access_token ||
          parsed?.session?.access_token;
        if (token) return token;
      } catch {
        // ignora parse inválido
      }
    }
  }
  return null;
}

async function getAuthToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) return token;
  } catch (err) {
    console.warn("[Auth] Falha ao obter sessão do Supabase", err);
  }

  // Fallback: ler token persistido no localStorage (sb-...-auth-token)
  if (typeof window !== "undefined") {
    try {
      const keys = Object.keys(window.localStorage);
      for (const k of keys) {
        const raw = window.localStorage.getItem(k);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          const token =
            parsed?.access_token ||
            parsed?.currentSession?.access_token ||
            parsed?.session?.access_token;
          if (token) {
            console.info("[Auth] Token encontrado em localStorage key:", k);
            return token;
          }
        } catch {
          // ignorar parse inválido
        }
      }
    } catch (err) {
      console.warn("[Auth] Falha ao ler token do localStorage", err);
    }
  }

  // Fallback: tentar ler cookie sb-...-auth-token
  const cookieToken = readCookieToken();
  if (cookieToken) {
    console.info("[Auth] Token encontrado em cookie supabase");
    return cookieToken;
  }

  return null;
}

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  // Verifica se o erro é explicitamente UNAUTHORIZED (401)
  const isUnauthorized = 
    error.data?.code === "UNAUTHORIZED" || 
    error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  const loginUrl = getLoginUrl();
  if (window.location.pathname !== loginUrl) {
    console.warn("[Auth] Sessão inválida ou expirada. Redirecionando para login...");
    window.location.href = loginUrl;
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    console.error("[API Query Error]", error);
    redirectToLoginIfUnauthorized(error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async headers() {
        const token = await getAuthToken();
        return token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="ouvidoria-theme-light">
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </trpc.Provider>
);



