import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/better-auth";

// Better Auth's endpoints: sign-up, sign-in, sign-out, verify-email,
// request-password-reset, reset-password, get-session, …
export const { GET, POST } = toNextJsHandler(auth);
