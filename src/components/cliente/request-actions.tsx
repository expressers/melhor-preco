"use client";

import { CheckCircleIcon, WarningCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import type { RequestStatus, ServiceRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

const CLIENT_CANCELLABLE: RequestStatus[] = ["submetido", "aguarda_atribuicao", "agente_atribuido"];

const CANCEL_REASONS = [
  "Já encontrei o produto",
  "Já não preciso",
  "Enganei-me no pedido",
  "Outro motivo",
] as const;

/** Cancel, mark as done and open a complaint, each only when it is allowed. */
export function RequestActions({ request }: { request: ServiceRequest }) {
  const canCancel = CLIENT_CANCELLABLE.includes(request.status);
  const canComplete = request.status === "pagamento_confirmado";
  const canComplain = request.status !== "submetido";

  return (
    <div className="flex flex-col gap-3">
      {canComplete && <CompleteButton id={request.id} />}
      <div className="flex flex-wrap gap-2">
        {canComplain && <ComplaintDialog id={request.id} />}
        {canCancel && <CancelDialog id={request.id} />}
      </div>
      {!canCancel && request.status !== "cancelado" && request.status !== "concluido" && (
        <p className="text-[0.8125rem] text-ink-2">
          Depois de o agente começar a consulta já não é possível cancelar. Se algo correu mal, abra uma reclamação.
        </p>
      )}
    </div>
  );
}

function CompleteButton({ id }: { id: string }) {
  return (
    <Button
      variant="default"
      size="lg"
      className="self-start"
      onClick={() => {
        const res = useStore.getState().completeRequest(id);
        if (res.ok) toast.success("Consulta concluída. Obrigado por usar o Melhor Preço.");
        else toast.error(res.error);
      }}
    >
      <CheckCircleIcon data-icon="inline-start" />
      Marcar como concluída
    </Button>
  );
}

function CancelDialog({ id }: { id: string }) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof CANCEL_REASONS)[number]>(CANCEL_REASONS[0]);
  const [other, setOther] = useState("");
  const text = reason === "Outro motivo" ? other.trim() : reason;

  const confirm = () => {
    const res = useStore.getState().cancelRequest(id, text, "cliente");
    if (!res.ok) return toast.error(res.error);
    toast.success(`Pedido ${id} cancelado`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-error">
          <XCircleIcon data-icon="inline-start" />
          Cancelar pedido
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-5 p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Cancelar o pedido?</DialogTitle>
          <DialogDescription>
            O pedido <span className="font-mono text-ink tabular">{id}</span> deixa de ser tratado. Não paga nada.
          </DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label="Motivo" className="flex flex-col gap-2">
          {CANCEL_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={reason === r}
              onClick={() => setReason(r)}
              className={cn(
                "press flex min-h-11 items-center gap-3 rounded-lg border px-3.5 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                reason === r ? "border-ink font-medium text-ink" : "border-line text-ink-2",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded-full border",
                  reason === r ? "border-ink bg-ink" : "border-[var(--field)]",
                )}
              >
                {reason === r && <span className="size-1.5 rounded-full bg-tag" />}
              </span>
              {r}
            </button>
          ))}
          {reason === "Outro motivo" && (
            <>
              <label htmlFor={`${uid}-other`} className="sr-only">
                Escreva o motivo
              </label>
              <Textarea
                id={`${uid}-other`}
                value={other}
                onChange={(e) => setOther(e.target.value)}
                placeholder="Escreva o motivo"
                rows={2}
                autoFocus
              />
            </>
          )}
        </div>
        <DialogFooter className="-mx-5 -mb-5 bg-paper p-4">
          <DialogClose asChild>
            <Button variant="outline">Manter pedido</Button>
          </DialogClose>
          <Button variant="destructive" onClick={confirm} disabled={!text}>
            Cancelar pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ComplaintDialog({ id }: { id: string }) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const len = reason.trim().length;

  const submit = () => {
    const res = useStore.getState().createComplaint(id, reason);
    if (!res.ok) return setError(res.error);
    toast.success("Reclamação enviada", {
      description: "A equipa Melhor Preço vai analisar e responder-lhe pelo telefone.",
    });
    setReason("");
    setError(undefined);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <WarningCircleIcon data-icon="inline-start" />
          Abrir reclamação
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-5 p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Abrir reclamação</DialogTitle>
          <DialogDescription>
            Conte-nos o que correu mal com o pedido <span className="font-mono text-ink tabular">{id}</span>: atraso,
            dados errados, fotografias em falta, um problema com o pagamento.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${uid}-r`} className="text-sm font-medium text-ink">
            O que aconteceu
          </label>
          <Textarea
            id={`${uid}-r`}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(undefined);
            }}
            rows={4}
            aria-invalid={!!error || undefined}
            aria-describedby={`${uid}-h`}
          />
          <p
            id={`${uid}-h`}
            role={error ? "alert" : undefined}
            className={cn("text-[0.8125rem]", error ? "font-medium text-error" : "text-ink-2")}
          >
            {error ?? (len < 10 ? `Pelo menos uma frase (faltam ${10 - len} caracteres).` : "Pronto a enviar.")}
          </p>
        </div>
        <DialogFooter className="-mx-5 -mb-5 bg-paper p-4">
          <DialogClose asChild>
            <Button variant="ghost">Fechar</Button>
          </DialogClose>
          <Button onClick={submit} disabled={len < 10}>
            Enviar reclamação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
