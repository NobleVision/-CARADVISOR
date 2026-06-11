import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { trpc } from "@/lib/trpc";
import { ClipboardCheck, ClipboardCopy, MessageCircleQuestion, Scale } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ChecklistVehicle = {
  year: number;
  make: string;
  model: string;
  mileage?: number;
  sellerType?: "Franchise Dealer" | "Independent Dealer" | "Private Seller";
  regionFlags?: string[];
  transmissionStyle?: string;
  engineDisplacementL?: string;
};

type Props = {
  /** Seeded inventory listing id (preferred — server resolves everything). */
  listingId?: string;
  /** Vehicle shape for real NHTSA-decoded VINs. */
  vehicle?: ChecklistVehicle;
  useCase?: string;
};

/**
 * Personalized pre-purchase action plan: history report, PPI, the three smart
 * dealer questions, and model-specific checks from the GOGETTER Reliability
 * Index — the exact playbook that turns research into a confident purchase.
 */
export function ChecklistCard({ listingId, vehicle, useCase }: Props) {
  const [copied, setCopied] = useState(false);
  const enabled = Boolean(listingId || vehicle);
  const query = trpc.find.checklist.useQuery(
    { listingId, vehicle, useCase },
    { enabled, retry: false, refetchOnWindowFocus: false },
  );

  if (!enabled) return null;

  const onCopy = async () => {
    if (!query.data) return;
    try {
      await navigator.clipboard.writeText(query.data.text);
      setCopied(true);
      toast.success("Checklist copied — paste it into your notes or texts");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  return (
    <Card data-tour="checklist">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="size-4 text-primary" />
          <CardTitle className="text-base font-medium">Pre-purchase action plan</CardTitle>
        </div>
        {query.data && (
          <Button size="sm" variant="outline" className="gap-1.5 bg-transparent" onClick={onCopy}>
            {copied ? <ClipboardCheck className="size-3.5 text-emerald-400" /> : <ClipboardCopy className="size-3.5" />}
            {copied ? "Copied" : "Copy checklist"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-5">
        {query.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}

        {query.isError && (
          <p className="text-sm text-muted-foreground">Couldn't build the checklist right now.</p>
        )}

        {query.data && (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {query.data.checklist.sections.map((section) => (
                <div key={section.title}>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </h4>
                  <ul className="space-y-2">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex gap-2.5 text-sm">
                        <span
                          className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                            item.critical ? "bg-rose-400" : "bg-primary/70"
                          }`}
                        />
                        <span className={item.critical ? "text-foreground/95" : "text-muted-foreground"}>
                          {item.critical && (
                            <Badge
                              variant="outline"
                              className="mr-1.5 border-rose-400/40 bg-rose-400/10 px-1.5 py-0 text-[9px] uppercase text-rose-300"
                            >
                              Key
                            </Badge>
                          )}
                          {item.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {query.data.checklist.dealerQuestions.length > 0 && (
              <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <MessageCircleQuestion className="size-4" /> Smart questions for the dealer — ask by phone first
                </div>
                <ol className="space-y-1.5">
                  {query.data.checklist.dealerQuestions.map((q, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground/90">
                      <span className="font-semibold text-primary">{i + 1}.</span>
                      <span>"{q}"</span>
                    </li>
                  ))}
                </ol>
                {query.data.checklist.dealerEvasionRule && (
                  <p className="mt-2.5 text-xs italic text-amber-300">
                    {query.data.checklist.dealerEvasionRule}
                  </p>
                )}
              </div>
            )}

            <Accordion type="single" collapsible>
              <AccordionItem value="golden-rules" className="border-none">
                <AccordionTrigger className="py-1.5 text-sm hover:no-underline">
                  <span className="flex items-center gap-1.5">
                    <Scale className="size-4 text-primary" /> The golden rules of budget car buying
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 pt-1">
                    {query.data.checklist.goldenRules.map((rule, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70" />
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
