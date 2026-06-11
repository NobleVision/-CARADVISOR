import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { configRouter } from "./routers/config";
import { vehicleRouter } from "./routers/vehicle";
import { findRouter } from "./routers/find";
import { contactRouter } from "./routers/contact";
import { notificationsRouter } from "./routers/notifications";
import { authenticateDemo, DEMO_ACCOUNTS } from "./demoAuth";
import { updateUserOnboarding } from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    /**
     * Credential ("demo") login. Validates username/password against the demo
     * account table and, on success, sets the same session cookie every
     * authenticated request uses. Lets anyone try the app instantly (admin/admin).
     */
    demoLogin: publicProcedure
      .input(
        z.object({
          username: z.string().min(1, "Username is required"),
          password: z.string().min(1, "Password is required"),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const result = await authenticateDemo(input.username, input.password);
        if (!result) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid username or password.",
          });
        }
        ctx.setSessionCookie(result.token);
        return {
          success: true,
          name: result.account.name,
          email: result.account.email,
        } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.clearSessionCookie();
      return {
        success: true,
      } as const;
    }),
    /**
     * Persist guided-tour completion/dismissal on the signed-in account so it
     * follows the user across devices (anonymous visitors use localStorage).
     * The SHARED demo account is exempt — persisting there would mark the
     * tour as taken for every future demo visitor — so it reports
     * persisted:false and the client keeps localStorage authoritative.
     */
    setOnboarding: protectedProcedure
      .input(
        z.object({
          status: z.enum(["completed", "dismissed"]),
          variant: z.enum(["quick", "full"]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const isDemoAccount = DEMO_ACCOUNTS.some((a) => a.openId === ctx.user.openId);
        if (isDemoAccount) return { persisted: false } as const;
        const persisted = await updateUserOnboarding(ctx.user.id, {
          status: input.status,
          variant: input.variant,
          at: new Date().toISOString(),
        });
        return { persisted };
      }),
  }),
  config: configRouter,
  vehicle: vehicleRouter,
  find: findRouter,
  contact: contactRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
