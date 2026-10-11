"use client";

import { SignInIcon } from "@phosphor-icons/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { useCurrentClient } from "@/lib/store";
import type { Client } from "@/lib/types";

/** Renders the area only for a signed-in client; otherwise asks to enter. */
export function ClientGate({ children }: { children: (client: Client) => ReactNode }) {
  const client = useCurrentClient();
  if (!client) {
    return (
      <EmptyState
        icon={<SignInIcon />}
        title="Entre na sua conta"
        description="Para fazer consultas e ver os seus pedidos, entre com o seu telefone ou crie uma conta. Leva menos de um minuto."
        action={
          <Button asChild variant="tag">
            <Link href={routes.cliente.entrar}>Entrar ou criar conta</Link>
          </Button>
        }
      />
    );
  }
  return <>{children(client)}</>;
}
