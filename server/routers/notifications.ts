import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../db";

export const notificationsRouter = router({
  /** Latest notifications for the signed-in user. */
  list: protectedProcedure.query(({ ctx }) => getNotifications(ctx.user.id, 50)),

  /** Unread badge count for the NavBar bell. */
  unreadCount: protectedProcedure.query(({ ctx }) =>
    getUnreadNotificationCount(ctx.user.id)
  ),

  markRead: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await markNotificationRead(ctx.user.id, input.id);
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await markAllNotificationsRead(ctx.user.id);
    return { success: true };
  }),
});
