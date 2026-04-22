import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import {
  type CmsAction,
  type CmsState,
  cmsReducer,
  createEmptyCmsState,
} from '../lib/admin/cms-state';
import { fetchCmsState, syncCmsAction } from '../lib/api-cms';
import { ApiClientError } from '../lib/api-client';
import { toast } from '../lib/notify';
import { useAuth } from './auth-context';

type CmsContextValue = {
  state: CmsState;
  status: 'loading' | 'ready' | 'offline';
  dispatch: (action: CmsAction) => void;
  resetWorkspace: () => void;
};

const CmsContext = createContext<CmsContextValue | null>(null);

function isExpiredAuthError(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    return error.status === 401 && /expired|unauthorized|authentication/i.test(error.message);
  }
  return error instanceof Error && /access token expired/i.test(error.message);
}

export function CmsProvider({ children }: { children: ReactNode }) {
  const { user, accessToken, refreshSession, signOut } = useAuth();
  const actor = user?.email ?? 'System';

  const [state, rawDispatch] = useReducer(cmsReducer, undefined, () => createEmptyCmsState());
  const [status, setStatus] = useState<CmsContextValue['status']>('loading');

  const refreshWorkspace = useCallback(async () => {
    let token = accessToken;
    let next: CmsState;
    try {
      next = await fetchCmsState(token);
    } catch (error) {
      if (!isExpiredAuthError(error)) throw error;
      token = await refreshSession();
      if (!token) {
        signOut();
        throw new Error('Session expired. Please sign in again.');
      }
      next = await fetchCmsState(token);
    }
    rawDispatch({ type: 'HYDRATE', payload: next });
    setStatus('ready');
  }, [accessToken, refreshSession, signOut]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        let token = accessToken;
        try {
          return await fetchCmsState(token);
        } catch (error) {
          if (!isExpiredAuthError(error)) throw error;
          token = await refreshSession();
          if (!token) {
            signOut();
            throw new Error('Session expired. Please sign in again.');
          }
          return await fetchCmsState(token);
        }
      } catch (error) {
        throw error;
      }
    };
    load()
      .then((next) => {
        if (!cancelled) {
          rawDispatch({ type: 'HYDRATE', payload: next });
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('offline');
          toast.error('API is unavailable. Live content could not be loaded.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshSession, signOut]);

  const dispatch = useCallback(
    (action: CmsAction) => {
      if (action.type === 'HYDRATE') {
        rawDispatch(action);
        return;
      }
      rawDispatch({ ...(action as Record<string, unknown>), actor } as CmsAction);
      void (async () => {
        try {
          await syncCmsAction(action, accessToken, state);
        } catch (error) {
          if (!isExpiredAuthError(error)) throw error;
          const freshToken = await refreshSession();
          if (!freshToken) {
            signOut();
            throw new Error('Session expired. Please sign in again.');
          }
          await syncCmsAction(action, freshToken, state);
        }
      })()
        .then(refreshWorkspace)
        .catch((err) => {
          toast.error(err instanceof Error ? err.message : 'Unable to sync with API.');
          void refreshWorkspace().catch(() => undefined);
        });
    },
    [accessToken, actor, refreshSession, refreshWorkspace, signOut, state],
  );

  const resetWorkspace = useCallback(() => {
    void refreshWorkspace().catch(() => {
      setStatus('offline');
    });
  }, [refreshWorkspace]);

  const value = useMemo(() => ({ state, status, dispatch, resetWorkspace }), [state, status, dispatch, resetWorkspace]);

  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
}

export function useCms(): CmsContextValue {
  const ctx = useContext(CmsContext);
  if (!ctx) throw new Error('useCms must be used within CmsProvider');
  return ctx;
}

/** Optional: use in command palette outside strict admin pages if needed */
export function useCmsOptional(): CmsContextValue | null {
  return useContext(CmsContext);
}

export function seedFreshCmsInBrowser(): void {
  sessionStorage.removeItem('phulpur24_demo_reset_preview');
  window.location.reload();
}
