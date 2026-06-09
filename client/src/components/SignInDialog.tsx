import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type SignInDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful demo login so the parent can refresh auth state. */
  onSuccess?: () => void;
};

export function SignInDialog({ open, onOpenChange, onSuccess }: SignInDialogProps) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");

  const demoLogin = trpc.auth.demoLogin.useMutation({
    onSuccess: (data) => {
      toast.success(`Welcome, ${data.name}`);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err.message || "Sign in failed");
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    demoLogin.mutate({ username: username.trim(), password });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Sign in</DialogTitle>
          <DialogDescription>
            Use the demo account to explore instantly — no setup required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signin-username">Username</Label>
            <Input
              id="signin-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signin-password">Password</Label>
            <Input
              id="signin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin"
              autoComplete="current-password"
            />
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Demo credentials: <span className="font-medium text-foreground">admin</span> /{" "}
            <span className="font-medium text-foreground">admin</span>
          </div>

          <Button type="submit" className="w-full" disabled={demoLogin.isPending}>
            {demoLogin.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Signing in…
              </>
            ) : (
              "Sign in to demo"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
