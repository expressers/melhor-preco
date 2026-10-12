// End-to-end acceptance flow of CHANGES-v2 §12 against the real store.
import { beforeEach, describe, expect, test } from "bun:test";
import { useStore } from "./store";

const s = () => useStore.getState();

describe("store: acceptance flow (CHANGES §12)", () => {
  beforeEach(() => s().reset());

  test("empresa → operator → agent → reference → payment → wallet → withdrawal → objective", () => {
    // Empresa client (cl-002) creates a 3-item request on Shopping Popular.
    s().setViewAs("cliente");
    s().setCurrentClient("cl-002");
    expect(s().quote(3).gross).toBe(2400);
    const created = s().createRequest({
      surfaceId: "sf-shopping-popular",
      priority: "normal",
      items: [
        { category: "electrodomesticos", name: "Geleira 350 L" },
        { category: "electrodomesticos", name: "Fogão 4 bocas" },
        { category: "electrodomesticos", name: "Micro-ondas 20 L" },
      ],
    });
    if (!created.ok) throw new Error(created.error);
    const id = created.request.id;
    expect(id).toBe("MP-2026-00042");
    expect(created.request.status).toBe("aguarda_atribuicao");
    expect(created.request.amounts).toMatchObject({ gross: 2400, net: 2105, taxes: 295 });

    // Operator of the surface assigns; an operator of another surface cannot.
    s().setViewAs("operador");
    s().setCurrentOperator("op-002");
    expect(s().assignAgent(id, "ag-001").ok).toBe(false);
    s().setCurrentOperator("op-001");
    expect(s().assignAgent(id, "ag-002").ok).toBe(false); // ag-002 is not on Shopping Popular
    expect(s().assignAgent(id, "ag-001").ok).toBe(true);

    // Agent accepts, starts and submits per item.
    s().setViewAs("agente");
    s().setCurrentAgent("ag-001");
    expect(s().acceptRequest(id).ok).toBe(true);
    expect(s().startConsultation(id).ok).toBe(true);
    const items = s().requests.find((r) => r.id === id)!.items;
    expect(
      s().submitResults(id, [
        { itemId: items[0].id, notFound: false, productName: "Geleira", price: 380000, store: "Loja A" },
      ]).ok,
    ).toBe(false); // items 2 and 3 missing
    const res = s().submitResults(id, [
      { itemId: items[0].id, notFound: false, productName: "Geleira", price: 380000, store: "Loja A" },
      { itemId: items[1].id, notFound: false, productName: "Fogão", price: 150000, store: "Loja B" },
      { itemId: items[2].id, notFound: true, productName: "Micro-ondas" },
    ]);
    expect(res.ok).toBe(true);
    let r = s().requests.find((x) => x.id === id)!;
    expect(r.status).toBe("resposta_submetida");
    expect(r.reference?.reference).toMatch(/^\d{9}$/);

    // Wallet before payment.
    const before = s().earnings.filter((e) => e.agentId === "ag-001").reduce((t, e) => t + e.amount, 0);

    // Platform confirms (demo button); duplicate is refused.
    expect(s().confirmReferencePayment(id, "demo").ok).toBe(true);
    const dup = s().confirmReferencePayment(id, "admin");
    expect(dup.ok).toBe(false);
    r = s().requests.find((x) => x.id === id)!;
    expect(r.status).toBe("pagamento_confirmado");
    const after = s().earnings.filter((e) => e.agentId === "ag-001").reduce((t, e) => t + e.amount, 0);
    expect(after - before).toBe(1263);

    // Withdrawal: first ok, second same day blocked; admin confirms.
    const w1 = s().requestWithdrawal(1000);
    if (!w1.ok) throw new Error(w1.error);
    expect(s().requestWithdrawal(100).ok).toBe(false);
    s().setViewAs("admin");
    expect(s().confirmWithdrawal(w1.withdrawal.id, "").ok).toBe(false);
    expect(s().confirmWithdrawal(w1.withdrawal.id, "TRF-TESTE-1").ok).toBe(true);
    expect(s().confirmWithdrawal(w1.withdrawal.id, "TRF-TESTE-1").ok).toBe(false);

    // Every step is in the audit log.
    expect(s().audit.some((a) => a.entityId === id && a.action.startsWith("Pagamento da referência"))).toBe(true);
    expect(s().audit.some((a) => a.entity === "withdrawal" && a.entityId === w1.withdrawal.id)).toBe(true);
  });

  test("one active operator per surface; objectives locked after start without reason", () => {
    s().setViewAs("admin");
    const dup = s().upsertOperator({
      name: "Novo Operador",
      phone: "923000111",
      surfaceId: "sf-shopping-popular",
      baseSalary: 100000,
      status: "activo",
    });
    expect(dup.ok).toBe(false);
    const sep = s().objectives.find((o) => o.id === "obj-2026-09-sf-cidade-da-china")!;
    const input = { ...sep, periodKey: sep.period.key, revenueTarget: 5000 };
    expect(s().upsertObjective(input).ok).toBe(false);
    const fixed = s().upsertObjective(input, "Correcção de teste com motivo suficiente");
    if (!fixed.ok) throw new Error(fixed.error);
    expect(fixed.objective.corrections.length).toBe(1);
    expect(fixed.objective.result?.met).toBe(true); // re-evaluated after the correction
  });

  test("pricing validation rejects splits that do not sum to 100", () => {
    s().setViewAs("admin");
    const p = s().pricing;
    expect(s().updatePricing({ ...p, split: { ...p.split, operatorMet: 15 } }).ok).toBe(false);
    expect(s().updatePricing({ ...p, simplePrice: 1200 }).ok).toBe(true);
    expect(s().quote(1).gross).toBe(1200);
  });

  test("reset keeps the role", () => {
    s().setViewAs("operador");
    s().reset();
    expect(s().session.viewAs).toBe("operador");
  });
});
