export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime.
export const getLoginUrl = () => {
  // Sempre redirecionar para a página de autenticação local do Supabase
  return "/auth";
};



