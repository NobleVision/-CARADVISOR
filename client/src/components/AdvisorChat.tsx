import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { vehicleTitle, type DecodeResult } from "@/lib/vehicle";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

type Props = { result: DecodeResult };

export function AdvisorChat({ result }: Props) {
  const { vehicle, score, mileage } = result;
  const [messages, setMessages] = useState<Message[]>([]);

  const advisor = trpc.vehicle.advisor.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    },
    onError: (err) => {
      toast.error("Advisor unavailable", { description: err.message });
      setMessages((prev) => prev.slice(0, -1));
    },
  });

  const handleSend = (content: string) => {
    const history = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content }]);
    advisor.mutate({
      vehicle,
      score,
      mileage: mileage ?? undefined,
      history,
      question: content,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="size-4 text-primary" />
        <span>
          Advising on the <span className="font-medium text-foreground">{vehicleTitle(vehicle)}</span> (Score{" "}
          {score.overall}, Grade {score.grade})
        </span>
      </div>
      <AIChatBox
        messages={messages}
        onSendMessage={handleSend}
        isLoading={advisor.isPending}
        height="560px"
        placeholder="Ask about reliability, what to inspect, the score, fair price range…"
        emptyStateMessage="Ask the GOGETTER advisor anything about this vehicle"
        suggestedPrompts={[
          "Why did this car get this score?",
          "What should I inspect before buying?",
          "Is this a reliable vehicle long-term?",
          "What questions should I ask the seller?",
        ]}
      />
    </div>
  );
}
