import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';

// Token refresh keeps the same session; logout or switching accounts invalidates it,
// even when the original account signs in again before the request completes.
export function captureImageActionSession(): { authenticated: boolean; isCurrent: () => boolean; dispose: () => void } {
  const userId = useUserStore.getState().user?._id ?? null;
  const authenticated = Boolean(useAuthStore.getState().accessToken);
  let valid = true;
  const unsubscribeAuth = useAuthStore.subscribe(state => {
    if (Boolean(state.accessToken) !== authenticated) valid = false;
  });
  const unsubscribeUser = useUserStore.subscribe(state => {
    if ((state.user?._id ?? null) !== userId) valid = false;
  });
  return {
    authenticated,
    isCurrent: () => valid,
    dispose: () => {
      unsubscribeAuth();
      unsubscribeUser();
    },
  };
}
