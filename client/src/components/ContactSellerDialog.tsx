import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, Mail, MessageSquare, Sparkles, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

type ContactSellerDialogProps = {
  listingId?: string;
  vin?: string;
  /** Display label, e.g. "2021 Toyota Camry". */
  vehicle: string;
  sellerType: string;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "secondary";
  className?: string;
  triggerLabel?: string;
};

type TemplateKind = "inquiry" | "price" | "inspection" | "paperwork";

const isPrivate = (sellerType: string) => sellerType === "Private Seller";

export function ContactSellerDialog({
  listingId,
  vin,
  vehicle,
  sellerType,
  size = "sm",
  variant = "outline",
  className,
  triggerLabel = "Contact seller",
}: ContactSellerDialogProps) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<TemplateKind>("inquiry");
  const [buyerName, setBuyerName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [edited, setEdited] = useState(false);
  const [copied, setCopied] = useState(false);

  const templatesQuery = trpc.contact.templates.useQuery(
    { listingId, vin },
    { enabled: open, refetchOnWindowFocus: false },
  );
  const generate = trpc.contact.generate.useMutation();
  const logInquiry = trpc.contact.logInquiry.useMutation();

  const templates = templatesQuery.data?.templates ?? [];
  const current = useMemo(
    () => templates.find((t) => t.kind === kind),
    [templates, kind],
  );

  // Load the selected template into the editor whenever it changes (unless the
  // user has manually edited the draft for this kind).
  useEffect(() => {
    if (current && !edited) {
      setSubject(current.subject);
      setMessage(current.body);
    }
  }, [current, edited]);

  function selectKind(next: TemplateKind) {
    setKind(next);
    setEdited(false);
  }

  function tryLog() {
    // Best-effort — silently ignored when signed out.
    logInquiry.mutate(
      { listingId, vin, sellerType, templateKind: kind, message },
      { onError: () => {} },
    );
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Message copied to clipboard");
      tryLog();
    } catch {
      toast.error("Couldn't copy — select the text and copy manually.");
    }
  }

  function handleEmail() {
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.location.href = url;
    tryLog();
  }

  function handlePersonalize() {
    generate.mutate(
      { listingId, vin, templateKind: kind, buyerName: buyerName || undefined, personalize: true },
      {
        onSuccess: (data) => {
          setMessage(data.message);
          setSubject(data.subject);
          setEdited(true);
          if (data.personalized) toast.success("Rewritten by the AI advisor");
          else toast.message("AI isn't configured — using the standard template.");
        },
        onError: (err) => toast.error(err.message || "Couldn't personalize the message"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant={variant} className={`gap-1.5 bg-transparent ${className ?? ""}`}>
          <MessageSquare className="size-3.5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Contact the seller</DialogTitle>
          <DialogDescription>
            A ready-to-send message for the {vehicle}, tailored for{" "}
            {isPrivate(sellerType) ? "a private owner" : "a dealership"}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {sellerType}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {isPrivate(sellerType)
              ? "Includes title, lien & safe-payment checks."
              : "Focuses on out-the-door pricing, fees & warranty."}
          </span>
        </div>

        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Message type</Label>
            <Select value={kind} onValueChange={(v) => selectKind(v as TemplateKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inquiry">Initial inquiry</SelectItem>
                <SelectItem value="price">Make an offer</SelectItem>
                <SelectItem value="inspection">Test drive &amp; inspection</SelectItem>
                <SelectItem value="paperwork">Closing checklist</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="buyer-name" className="text-xs">
                Your name (optional)
              </Label>
              <Input
                id="buyer-name"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="e.g. Alex"
                className="h-9"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-9 gap-1.5"
              onClick={handlePersonalize}
              disabled={generate.isPending || templatesQuery.isLoading}
            >
              {generate.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5 text-primary" />
              )}
              Personalize with AI
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject" className="text-xs">
              Subject
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setEdited(true);
              }}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="message" className="text-xs">
              Message
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setEdited(true);
              }}
              rows={11}
              className="resize-none font-sans text-sm leading-relaxed"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" className="gap-1.5 bg-transparent" onClick={handleCopy}>
            {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button className="gap-1.5" onClick={handleEmail}>
            <Mail className="size-4" />
            Open in email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
