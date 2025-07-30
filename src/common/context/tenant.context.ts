import { AsyncLocalStorage } from 'async_hooks';

interface TenantContext {
  tenantId: string;
}

export const tenantContext = new AsyncLocalStorage<TenantContext>();

export function getTenantId(): string | undefined {
  return tenantContext.getStore()?.tenantId;
}

export function setTenantId(tenantId: string): void {
  const store = tenantContext.getStore();
  if (store) {
    store.tenantId = tenantId;
  } else {
    // This case should ideally not happen if middleware is set up correctly
    // but good to log or handle defensively.
    console.warn('Attempted to set tenantId outside of a tenant context store.');
  }
}
