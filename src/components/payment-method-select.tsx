import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Banknote } from "lucide-react";

export type PaymentMethod = "mtn" | "airtel" | "zamtel" | "cash";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "mtn", label: "MTN Mobile Money" },
  { value: "airtel", label: "Airtel Money" },
  { value: "zamtel", label: "Zamtel Kwacha" },
  { value: "cash", label: "Cash / Bank" },
];

export function PaymentMethodIcon({
  method,
  className = "h-4 w-4",
}: {
  method?: string | null;
  className?: string;
}) {
  switch (method) {
    case "mtn":
      return (
        <span
          className={`${className} inline-flex items-center justify-center rounded-sm bg-[#FFCC00] text-[7px] font-black text-black`}
          aria-label="MTN"
          title="MTN Mobile Money"
        >
          MTN
        </span>
      );
    case "airtel":
      return (
        <span
          className={`${className} inline-flex items-center justify-center rounded-full bg-[#E40000] text-[6px] font-black text-white`}
          aria-label="Airtel"
          title="Airtel Money"
        >
          airtel
        </span>
      );
    case "zamtel":
      return (
        <span
          className={`${className} inline-flex items-center justify-center rounded-sm bg-[#009639] text-[6px] font-black text-white`}
          aria-label="Zamtel"
          title="Zamtel Kwacha"
        >
          ZAMTEL
        </span>
      );
    default:
      return <Banknote className={className} />;
  }
}

export function PaymentMethodSelect({
  value,
  onChange,
  placeholder = "Choose payment method",
}: {
  value: string;
  onChange: (v: PaymentMethod) => void;
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PaymentMethod)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>
          {value && (
            <span className="flex items-center gap-2">
              <PaymentMethodIcon method={value} />
              {PAYMENT_METHODS.find((p) => p.value === value)?.label}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PAYMENT_METHODS.map((p) => (
          <SelectItem key={p.value} value={p.value}>
            <span className="flex items-center gap-2">
              <PaymentMethodIcon method={p.value} />
              {p.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
