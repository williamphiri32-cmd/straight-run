import { Card } from "@/components/ui/card";
import { Coins } from "lucide-react";

export function PayoutRulesCard() {
  return (
    <Card className="p-6">
      <header className="mb-4 flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Coins className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">
            End-of-cycle payout & profit
          </h2>
          <p className="text-sm text-muted-foreground">
            Group-wide rules applied to every member at share-out.
          </p>
        </div>
      </header>

      <div className="space-y-4 text-sm">
        <section>
          <h3 className="font-medium">Payout at the end of the financial cycle</h3>
          <p className="mt-1 text-muted-foreground">
            At the end of each financial cycle, every member is paid out their
            total contributions plus the profit earned on the amount they saved
            and the penalties collected during the cycle.
          </p>
        </section>

        <section>
          <h3 className="font-medium">How profit is calculated</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              Profit is calculated <strong>monthly</strong> based on the percentage
              ratio of each member's contribution against the total amount saved
              by the group in that month.
            </li>
            <li>
              The monthly profit pool is the sum of <strong>loan interest</strong>{" "}
              and <strong>penalties</strong> collected in that month.
            </li>
            <li>
              A member's profit for the month ={" "}
              <em>(member contribution ÷ group contribution) × monthly profit pool</em>.
            </li>
            <li>
              Total payout = total contributions + sum of monthly profit shares.
            </li>
          </ul>
        </section>
      </div>
    </Card>
  );
}
