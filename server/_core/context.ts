import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { sdk } from "./sdk";
import { validateSession } from "../auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Tentar autenticação local primeiro (cookie session_token)
  const sessionToken = opts.req.cookies?.['session_token'];
  if (sessionToken) {
    try {
      user = await validateSession(sessionToken);
    } catch (error) {
      // Sessão inválida, continuar para OAuth
      user = null;
    }
  }

  // Se não tem sessão local, tentar OAuth (se habilitado)
  if (!user && ENV.authEnabled) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication é opcional para procedimentos públicos.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
