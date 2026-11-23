import axios from "@/lib/axios";

type Tokens = { accessToken: string; refreshToken: string };

/**
 * One refresh per refresh token.
 *
 * Several requests can fail with 401 at the same time (and every component
 * using AxiosJWTInstance adds its own interceptor). The API rotates refresh
 * tokens and treats a reused one as stolen, so all callers holding the same
 * old token must share the same refresh call and its result.
 */
const refreshes = new Map<string, Promise<Tokens>>();
const KEEP_RESULT_MS = 30_000;

export const useRefreshToken = ({ user }: { user: any }) => {
  const refreshToken = (): Promise<Tokens> => {
    const token: string = user?.refreshToken;
    const pending = refreshes.get(token);
    if (pending) return pending;

    const request = axios
      .post<Tokens>("/refresh", { refreshToken: token })
      .then((res) => res.data);
    refreshes.set(token, request);

    // Forget failures right away, successes after a short while
    request.then(
      () => setTimeout(() => refreshes.delete(token), KEEP_RESULT_MS),
      () => refreshes.delete(token)
    );
    return request;
  };
  return refreshToken;
};
