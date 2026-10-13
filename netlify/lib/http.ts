import { getUser, refreshSession, verifyRequestOrigin } from '@netlify/identity';
import type { Context } from '@netlify/functions';
import { z } from 'zod';
import { isAdministrator } from './validation.js';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

export async function requireAdmin(request: Request, context: Context) {
  if (!['GET', 'HEAD'].includes(request.method)) verifyRequestOrigin(request);
  await refreshSession();
  const user = await getUser();
  if (!user) throw new HttpError(401, 'Entre com sua conta administrativa.');
  if (!isAdministrator(user)) throw new HttpError(403, 'Esta conta não possui a permissão admin.');
  void context;
  return user;
}

export async function body<T>(request: Request, schema: z.ZodType<T>, limit = 350000): Promise<T> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'Envie conteúdo JSON.');
  if (Number(request.headers.get('content-length')) > limit) throw new HttpError(413, 'Conteúdo muito grande.');
  const text = await request.text();
  if (Buffer.byteLength(text) > limit) throw new HttpError(413, 'Conteúdo muito grande.');
  try { return schema.parse(JSON.parse(text)); }
  catch (error) {
    if (error instanceof z.ZodError) throw new HttpError(422, error.issues.slice(0, 5).map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '));
    throw new HttpError(400, 'JSON inválido.');
  }
}

export function handleErrors(handler: (request: Request, context: Context) => Promise<Response>) {
  return async (request: Request, context: Context): Promise<Response> => {
    try { return await handler(request, context); }
    catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      if (error instanceof Error && error.name === 'AuthError') return json({ error: 'Falha na autenticação ou origem da requisição.' }, 403);
      return json({ error: 'Serviço indisponível. Verifique a configuração de Identity, banco e armazenamento na Netlify.' }, 503);
    }
  };
}
