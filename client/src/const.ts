export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * The login/landing route. The app redirects here whenever an authenticated
 * session is required (see the 401 handler in main.tsx and useAuth).
 */
export const getLoginUrl = () => "/login";
