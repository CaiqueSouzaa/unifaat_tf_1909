import { AxiosError } from "axios";

interface ApiErrorBody {
  error?: string;
}

/** Mensagem de erro vinda da API ({ error: "..." }) ou a mensagem padrão. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof AxiosError)) return fallback;

  const body = error.response?.data as ApiErrorBody | undefined;

  return body?.error ?? fallback;
}
