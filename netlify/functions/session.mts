import type { Context } from '@netlify/functions';
import { login, logout, acceptInvite, requestPasswordRecovery, recoverPassword, verifyRequestOrigin } from '@netlify/identity';
import { z } from 'zod';
import { body, handleErrors, HttpError, json, requireAdmin } from '../lib/http.js';
import { isAdministrator } from '../lib/validation.js';

const sessionSchema = z.object({
  action: z.enum(['login', 'logout', 'invite', 'recover', 'request-recovery']),
  email: z.email().optional(),
  password: z.string().min(8).max(200).optional(),
  token: z.string().min(10).max(2048).optional(),
});

export default handleErrors(async (request: Request, context: Context) => {
  if (request.method === 'GET') {
    const user = await requireAdmin(request, context);
    return json({ user: { id: user.id, email: user.email, name: user.name } });
  }
  if (request.method !== 'POST') throw new HttpError(405, 'Método não permitido.');
  verifyRequestOrigin(request);
  const input = await body(request, sessionSchema, 6000);
  if (input.action === 'logout') { await logout(); return json({ ok: true }); }
  if (input.action === 'request-recovery') {
    if (!input.email) throw new HttpError(422, 'Informe seu e-mail.');
    await requestPasswordRecovery(input.email);
    return json({ ok: true });
  }
  if (!input.password) throw new HttpError(422, 'Informe a senha (mínimo de 8 caracteres).');
  try {
    const user = input.action === 'login' && input.email
      ? await login(input.email, input.password)
      : input.action === 'invite' && input.token
        ? await acceptInvite(input.token, input.password)
        : input.action === 'recover' && input.token
          ? await recoverPassword(input.token, input.password)
          : null;
    if (!user) throw new HttpError(422, 'Informe e-mail ou token válido.');
    if (!isAdministrator(user)) { await logout(); throw new HttpError(403, 'Solicite a permissão admin ao responsável pelo site.'); }
    return json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, 'Não foi possível autenticar. Verifique os dados e a ativação de Identity.');
  }
});

export const config = { path: '/api/session' };
