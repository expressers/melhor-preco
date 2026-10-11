"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { TagMark } from "@/components/price-tag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { routes } from "@/lib/routes";
import { useCurrentClient, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { describedBy, Field } from "./field";

type Mode = "criar" | "entrar";

const phone = z
  .string()
  .trim()
  .refine((v) => v.replace(/\D/g, "").replace(/^244/, "").length === 9, {
    message: "Escreva os 9 dígitos do telefone, por exemplo 923 456 789.",
  });

const loginSchema = z.object({
  phone,
  password: z.string().min(1, "Escreva a sua palavra-passe."),
});

const registerSchema = z.object({
  name: z.string().trim().min(3, "Escreva o seu nome, como quer que o agente o trate."),
  phone,
  password: z.string().min(6, "Use pelo menos 6 caracteres."),
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || z.email().safeParse(v).success, { message: "Este e-mail não parece válido." }),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function EntrarForm() {
  const [mode, setMode] = useState<Mode>("criar");
  const current = useCurrentClient();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-2">
        <TagMark className="text-2xl" />
        <h1 className="text-[1.75rem]">{mode === "criar" ? "Criar a sua conta" : "Entrar na sua conta"}</h1>
        <p className="text-[0.9375rem] text-ink-2">
          {mode === "criar"
            ? "O telefone é o seu contacto principal: é por ele que entra e que o agente o identifica."
            : "Entre com o telefone e a palavra-passe que usou ao criar a conta."}
        </p>
      </div>

      <div
        role="group"
        aria-label="Criar conta ou entrar"
        className="grid grid-cols-2 gap-1 rounded-full border border-line bg-paper-2 p-1"
      >
        {(["criar", "entrar"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "press h-11 rounded-full text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
              mode === m ? "bg-surface text-ink shadow-soft" : "text-ink-2",
            )}
          >
            {m === "criar" ? "Criar conta" : "Já tenho conta"}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-line bg-surface p-5 sm:p-6">
        {mode === "criar" ? <RegisterForm /> : <LoginForm />}
      </div>

      {current && (
        <p className="text-sm text-ink-2">
          Sessão aberta como <span className="font-medium text-ink">{current.name}</span>.{" "}
          <Link href={routes.cliente.home} className="font-medium text-ink underline">
            Continuar para a sua área
          </Link>
        </p>
      )}

      <p className="rounded-lg bg-paper-2 px-4 py-3 text-[0.8125rem] leading-relaxed text-ink-2">
        Demonstração: as contas de exemplo usam a palavra-passe{" "}
        <span className="font-mono text-ink">demo1234</span>, por exemplo o telefone{" "}
        <span className="font-mono text-ink tabular">923 115 480</span>.
      </p>
    </div>
  );
}

function PasswordInput({
  id,
  invalid,
  describedById,
  autoComplete,
  ...rest
}: React.ComponentProps<"input"> & { invalid?: boolean; describedById?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        aria-describedby={describedById}
        className="pr-12"
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
        aria-pressed={show}
        className="press absolute top-0 right-0 grid size-11 place-items-center rounded-full text-ink-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        {show ? <EyeSlashIcon className="size-5" /> : <EyeIcon className="size-5" />}
      </button>
    </div>
  );
}

function useAfterAuth() {
  const router = useRouter();
  return (name: string, created: boolean) => {
    const first = name.split(" ")[0];
    toast.success(created ? `Conta criada. Boas-vindas, ${first}.` : `Olá de novo, ${first}.`);
    router.push(created ? routes.cliente.nova : routes.cliente.home);
  };
}

function RegisterForm() {
  const uid = useId();
  const after = useAfterAuth();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", phone: "", password: "", email: "" },
  });

  const onSubmit = (v: RegisterValues) => {
    const res = useStore.getState().registerClient({
      name: v.name,
      phone: v.phone,
      password: v.password,
      email: v.email || undefined,
    });
    if (!res.ok) {
      if (res.error.includes("telefone")) setError("phone", { message: res.error });
      else toast.error(res.error);
      return;
    }
    after(res.client.name, true);
  };

  const id = (k: string) => `${uid}-${k}`;
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <Field id={id("name")} label="Nome" error={errors.name?.message}>
        <Input
          id={id("name")}
          autoComplete="name"
          aria-invalid={!!errors.name || undefined}
          aria-describedby={describedBy(id("name"), errors.name?.message, false)}
          {...register("name")}
        />
      </Field>
      <Field
        id={id("phone")}
        label="Telefone"
        hint="Número angolano de 9 dígitos. Não partilhamos com as lojas."
        error={errors.phone?.message}
      >
        <PhoneInput id={id("phone")} invalid={!!errors.phone} error={errors.phone?.message} {...register("phone")} />
      </Field>
      <Field id={id("password")} label="Palavra-passe" hint="Pelo menos 6 caracteres." error={errors.password?.message}>
        <PasswordInput
          id={id("password")}
          autoComplete="new-password"
          invalid={!!errors.password}
          describedById={describedBy(id("password"), errors.password?.message)}
          {...register("password")}
        />
      </Field>
      <Field
        id={id("email")}
        label="E-mail"
        optional
        hint="Só para recibos e avisos, se preferir."
        error={errors.email?.message}
      >
        <Input
          id={id("email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-invalid={!!errors.email || undefined}
          aria-describedby={describedBy(id("email"), errors.email?.message)}
          {...register("email")}
        />
      </Field>
      <Button type="submit" variant="tag" size="lg" disabled={isSubmitting} className="mt-1 w-full">
        Criar conta
      </Button>
    </form>
  );
}

function LoginForm() {
  const uid = useId();
  const after = useAfterAuth();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", password: "" },
  });

  const onSubmit = (v: LoginValues) => {
    const res = useStore.getState().login(v.phone, v.password);
    if (!res.ok) {
      setError("password", { message: res.error });
      return;
    }
    after(res.client.name, false);
  };

  const id = (k: string) => `${uid}-${k}`;
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <Field id={id("phone")} label="Telefone" error={errors.phone?.message}>
        <PhoneInput id={id("phone")} invalid={!!errors.phone} error={errors.phone?.message} noHint {...register("phone")} />
      </Field>
      <Field id={id("password")} label="Palavra-passe" error={errors.password?.message}>
        <PasswordInput
          id={id("password")}
          autoComplete="current-password"
          invalid={!!errors.password}
          describedById={describedBy(id("password"), errors.password?.message, false)}
          {...register("password")}
        />
      </Field>
      <Button type="submit" variant="tag" size="lg" disabled={isSubmitting} className="mt-1 w-full">
        Entrar
      </Button>
    </form>
  );
}

/** Phone with a fixed +244 prefix so people type only the 9 local digits. */
function PhoneInput({
  id,
  invalid,
  error,
  noHint,
  ...rest
}: React.ComponentProps<"input"> & { invalid?: boolean; error?: string; noHint?: boolean }) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 grid place-items-center pl-3.5 font-mono text-sm text-ink-2 tabular"
      >
        +244
      </span>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="923 456 789"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy(id ?? "", error, !noHint)}
        className="pl-[3.75rem] font-mono tabular"
        {...rest}
      />
    </div>
  );
}
