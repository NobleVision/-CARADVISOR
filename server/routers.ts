import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { vehicleRouter } from "./routers/vehicle";
import { findRouter } from "./routers/find";
import { contactRouter } from "./routers/contact";
import { notificationsRouter } from "./routers/notifications";
import { authenticateDemo } from "./demoAuth";

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
  }),
  vehicle: vehicleRouter,
  find: findRouter,
  contact: contactRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
