import { AsyncLocalStorage } from 'async_hooks';

export interface AuditUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export const auditContext = new AsyncLocalStorage<{
  user: AuditUser;
}>();
