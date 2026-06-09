import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, BellRing, Sparkles, TrendingDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function NotificationsBell() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const unread = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const list = trpc.notifications.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const invalidate = () => {
    utils.notifications.unreadCount.invalidate();
    utils.notifications.list.invalidate();
  };
  const markAll = trpc.notifications.markAllRead.useMutation({ onSuccess: invalidate });
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: invalidate });

  if (!isAuthenticated) return null;

  const count = unread.data ?? 0;
  const items = list.data ?? [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          {count > 0 ? <BellRing className="size-5" /> : <Bell className="size-5" />}
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <span className="text-sm font-medium">Alerts</span>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAll.mutate()}
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No alerts yet. Save a car to track its price, or save a Find My Car
              search to hear about new matches.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`cursor-default px-3 py-2.5 ${n.readAt ? "opacity-60" : "bg-primary/5"}`}
                  onClick={() => !n.readAt && markRead.mutate({ id: n.id })}
                >
                  <div className="flex items-start gap-2">
                    {n.type === "price_drop" ? (
                      <TrendingDown className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                    ) : (
                      <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{n.title}</p>
                      {n.body && (
                        <p className="text-xs leading-snug text-muted-foreground">{n.body}</p>
                      )}
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
