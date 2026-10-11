"use client";

import { CheckCircleIcon, SealCheckIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PriceTag } from "@/components/price-tag";
import { Receipt, ReceiptRow, ReceiptRule, ReceiptTotal } from "@/components/receipt";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime, formatKz, formatPhone } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Agent, ServiceRequest } from "@/lib/types";
import styles from "./agente.module.scss";

/** The money split for one request, as a talão. */
export function SplitReceipt({ request, title }: { request: ServiceRequest; title: string }) {
  return (
    <Receipt title={title} meta={request.id}>
      <ReceiptRow label="Valor pago pelo cliente" value={formatKz(request.price)} />
      <ReceiptRow label="Comissão Melhor Preço" value={`- ${formatKz(request.platformShare)}`} />
      <ReceiptRule />
      <ReceiptTotal label="Fica para si" amount={request.agentShare} />
      <p className="pb-5 text-xs leading-relaxed text-ink-2">
        O cliente paga o valor total directamente ao seu Multicaixa Express. Depois de confirmar a recepção, a
        comissão de {formatKz(request.platformShare)} fica registada como devida à plataforma.
      </p>
    </Receipt>
  );
}

/** resposta_submetida: what the client must pay and where. */
export function AwaitingPayment({ request, agent }: { request: ServiceRequest; agent: Agent }) {
  return (
    <section aria-labelledby="aguarda-pagamento" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h2 id="aguarda-pagamento" className="text-lg font-semibold text-ink">
          Aguarda pagamento do cliente
        </h2>
        <p className="measure text-[0.9375rem] text-ink-2">
          A resposta foi enviada{request.respondedAt ? ` em ${formatDateTime(request.respondedAt)}` : ""}. O cliente
          já sabe quanto pagar e para onde. Confirme só quando o dinheiro entrar na sua conta.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
        <p className="text-sm text-ink-2">O cliente vai pagar</p>
        <PriceTag amount={request.price} size="xl" label="Valor a receber" />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 pt-1 text-sm">
          <dt className="text-ink-2">Multicaixa Express</dt>
          <dd className="font-mono text-ink tabular">{formatPhone(agent.paymentInfo.phone)}</dd>
          <dt className="text-ink-2">Titular</dt>
          <dd className="text-ink">{agent.paymentInfo.holder}</dd>
        </dl>
      </div>

      <SplitReceipt request={request} title="Divisão do valor" />
    </section>
  );
}

/** Confirmation dialog. Guards against double taps; the store also rejects duplicates. */
export function ConfirmPaymentDialog({
  request,
  open,
  onOpenChange,
}: {
  request: ServiceRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);

  function confirm() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    const res = useStore.getState().confirmPayment(request.id);
    if (!res.ok) {
      toast.error(res.error);
      busy.current = false;
      setPending(false);
      onOpenChange(false);
      return;
    }
    toast.success("Pagamento confirmado", {
      description: "Os resultados foram desbloqueados para o cliente.",
    });
    onOpenChange(false);
    // Keep the guard on: this request can never be confirmed again from here.
    setPending(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="gap-5 p-5">
        <DialogHeader className="gap-2 text-left">
          <DialogTitle className="text-lg font-semibold">Recebeu {formatKz(request.price)}?</DialogTitle>
          <DialogDescription className="text-[0.9375rem] text-ink-2">
            Confirme só se o valor já entrou no seu Multicaixa Express. Esta confirmação não se pode desfazer e
            desbloqueia os resultados para o cliente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row [&>*]:h-12 [&>*]:w-full sm:[&>*]:flex-1">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Ainda não
          </Button>
          <Button variant="tag" onClick={confirm} disabled={pending} aria-busy={pending}>
            <CheckCircleIcon weight="bold" />
            Sim, recebi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** pagamento_confirmado / concluido */
export function PaymentDone({ request }: { request: ServiceRequest }) {
  return (
    <section aria-labelledby="pago" className="flex flex-col gap-4">
      <div className="flex flex-col items-start gap-3">
        <span className={styles.stamp}>
          <SealCheckIcon weight="bold" className="size-4" aria-hidden />
          Pago
        </span>
        <h2 id="pago" className="text-lg font-semibold text-ink">
          Tarefa concluída
        </h2>
        <p className="measure text-[0.9375rem] text-ink-2">
          Confirmou a recepção do pagamento
          {request.paidAt ? ` em ${formatDateTime(request.paidAt)}` : ""}. Os resultados já estão disponíveis para o
          cliente.
        </p>
      </div>
      <SplitReceipt request={request} title="Talão da tarefa" />
    </section>
  );
}
