"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { ChoiceTile } from "./shared";

const REASONS = [
  "O produto não se vende na minha superfície",
  "Não consigo ir à superfície dentro do prazo",
  "A descrição do pedido não é clara",
  "A superfície está fechada",
];

/** Bottom sheet: pick a preset reason (one tap) or write one. */
export function RejectSheet({
  requestId,
  open,
  onOpenChange,
  onDone,
}: {
  requestId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [preset, setPreset] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const reason = [preset, other.trim()].filter(Boolean).join(". ");

  function submit() {
    if (busy.current) return;
    if (reason.length < 5) {
      setError("Escolha um motivo ou escreva-o em poucas palavras.");
      return;
    }
    busy.current = true;
    const res = useStore.getState().rejectRequest(requestId, reason);
    busy.current = false;
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Pedido rejeitado", { description: "Voltou à fila para ser atribuído a outro agente." });
    onOpenChange(false);
    onDone();
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setError(null);
        }
      }}
    >
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90dvh] max-w-3xl gap-0 overflow-y-auto rounded-t-2xl bg-paper pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader className="px-4 pt-5 pb-3 sm:px-5">
          <SheetTitle className="text-lg font-semibold">Rejeitar pedido</SheetTitle>
          <SheetDescription className="text-ink-2">
            O pedido volta à fila e a administração vê o motivo.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 sm:px-5">
          <div role="radiogroup" aria-label="Motivo" className="flex flex-col gap-2">
            {REASONS.map((r) => (
              <ChoiceTile
                key={r}
                role="radio"
                checked={preset === r}
                onToggle={() => {
                  setPreset(preset === r ? null : r);
                  setError(null);
                }}
              >
                <span className="whitespace-normal">{r}</span>
              </ChoiceTile>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="motivo-outro">{preset ? "Quer acrescentar algo? (opcional)" : "Outro motivo"}</Label>
            <Textarea
              id="motivo-outro"
              value={other}
              onChange={(e) => {
                setOther(e.target.value);
                setError(null);
              }}
              placeholder="Ex.: estou noutra superfície até amanhã"
              className="min-h-20"
              aria-invalid={!!error}
              aria-describedby={error ? "motivo-erro" : undefined}
            />
            {error && (
              <p id="motivo-erro" className="text-sm text-error">
                {error}
              </p>
            )}
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 px-4 pt-4 pb-4 sm:px-5 [&>*]:h-12 [&>*]:flex-1">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={submit}>
            Rejeitar pedido
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
