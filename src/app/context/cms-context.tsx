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
import { useLocation } from 'react-router';
import {
  type CmsAction,
  type CmsState,
  CMS_VERSION,
  cmsReducer,
  createEmptyCmsState,
} from '../lib/admin/cms-state';
import { fetchCmsState, syncCmsAction } from '../lib/api-cms';
import { ApiClientError } from '../lib/api-client';
import { toast } from '../lib/notify';
import { useAuth } from './auth-context';
import { hasMinimumRole, type AdminRole } from '../lib/admin/role-access';

type CmsContextValue = {
  state: CmsState;
  status: 'loading' | 'ready' | 'offline';
  error: { kind: 'auth' | 'forbidden' | 'network'; message: string } | null;
  dispatch: (action: CmsAction) => void;
  resetWorkspace: () => void;
};

const CmsContext = createContext<CmsContextValue | null>(null);
const PUBLIC_CACHE_KEY = 'phulpur24_public_state_cache_v2';
const PUBLIC_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const ADMIN_CACHE_KEY = 'phulpur24_admin_state_cache_v1';
const ADMIN_CACHE_MAX_AGE_MS = 10 * 60 * 1000;

type PublicStateCache = {
  savedAt: number;
  state: CmsState;
};

type AdminStateCache = {
  savedAt: number;
  userKey: string;
  state: CmsState;
};

function readPublicStateCache(): CmsState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PUBLIC_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PublicStateCache;
    if (!parsed?.state || parsed.state.version !== CMS_VERSION || !Array.isArray(parsed.state.posts)) return null;
    if (parsed.state.posts.length === 0) return null;
    if (Date.now() - parsed.savedAt > PUBLIC_CACHE_MAX_AGE_MS) return null;
    return parsed.state;
  } catch {
    return null;
  }
}

function writePublicStateCache(state: CmsState): void {
  if (typeof window === 'undefined' || state.posts.length === 0) return;
  try {
    window.localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), state }));
  } catch {
    /* private mode or storage quota */
  }
}

function readAdminStateCache(userKey: string): CmsState | null {
  if (typeof window === 'undefined' || !userKey) return null;
  try {
    const raw = window.sessionStorage.getItem(ADMIN_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminStateCache;
    if (!parsed?.state || parsed.state.version !== CMS_VERSION || !Array.isArray(parsed.state.posts)) return null;
    if (parsed.userKey !== userKey) return null;
    if (Date.now() - parsed.savedAt > ADMIN_CACHE_MAX_AGE_MS) return null;
    return parsed.state;
  } catch {
    return null;
  }
}

function writeAdminStateCache(userKey: string, state: CmsState): void {
  if (typeof window === 'undefined' || !userKey) return;
  try {
    window.sessionStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), userKey, state }));
  } catch {
    /* private mode or storage quota */
  }
}

function isExpiredAuthError(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    return error.status === 401 && /expired|unauthorized|authentication/i.test(error.message);
  }
  return error instanceof Error && /access token expired/i.test(error.message);
}

function classifyLoadError(error: unknown): { kind: 'auth' | 'forbidden' | 'network'; message: string } {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return { kind: 'auth', message: 'Session expired. Please sign in again.' };
    }
    if (error.status === 403) {
      return { kind: 'forbidden', message: 'Your account does not have permission to access this workspace.' };
    }
  }
  if (error instanceof Error && /session expired|access token expired/i.test(error.message)) {
    return { kind: 'auth', message: 'Session expired. Please sign in again.' };
  }
  return { kind: 'network', message: 'API is unavailable. Live content could not be loaded.' };
}

const ACTION_MIN_ROLE: Partial<Record<CmsAction['type'], AdminRole>> = {
  CATEGORY_ADD: 'EDITOR',
  CATEGORY_UPDATE: 'EDITOR',
  CATEGORY_DELETE: 'EDITOR',
  TAG_DELETE: 'EDITOR',
  TAGS_MERGE: 'EDITOR',
  MEDIA_DELETE: 'EDITOR',
  COMMENT_SET_STATUS: 'EDITOR',
  COMMENT_DELETE: 'EDITOR',
  USER_ADD: 'ADMIN',
  USER_UPDATE: 'ADMIN',
  USER_DELETE: 'ADMIN',
  PAGE_UPSERT: 'EDITOR',
  PAGE_DELETE: 'EDITOR',
  CONTACT_MESSAGE_SET_STATUS: 'EDITOR',
  CONTACT_MESSAGE_DELETE: 'EDITOR',
  NEWSLETTER_SUBSCRIBER_SET_STATUS: 'EDITOR',
  NEWSLETTER_SUBSCRIBER_DELETE: 'EDITOR',
  AD_UPSERT: 'EDITOR',
  AD_DELETE: 'EDITOR',
  NAVIGATION_UPSERT: 'EDITOR',
  NAVIGATION_DELETE: 'EDITOR',
  ANALYTICS_SNAPSHOT_UPSERT: 'EDITOR',
  ANALYTICS_SNAPSHOT_DELETE: 'EDITOR',
  SETTINGS_SET: 'ADMIN',
};

export function CmsProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, accessToken, refreshSession, signOut } = useAuth();
  const isAdminPath = location.pathname.startsWith('/admin');
  const shouldFetchAdmin = Boolean(accessToken && isAdminPath);
  const shouldFetchPublic = !shouldFetchAdmin && !isAdminPath && location.pathname !== '/login';
  const dataToken = shouldFetchAdmin ? accessToken : null;
  const actor = user?.email ?? 'System';
  const adminUserKey = user?.id ?? user?.email ?? '';
  const initialCachedState = useMemo(() => {
    if (shouldFetchAdmin) return readAdminStateCache(adminUserKey);
    if (shouldFetchPublic) return readPublicStateCache();
    return null;
  }, [adminUserKey, shouldFetchAdmin, shouldFetchPublic]);

  const [state, rawDispatch] = useReducer(cmsReducer, initialCachedState, (cached) => cached ?? createEmptyCmsState());
  const [status, setStatus] = useState<CmsContextValue['status']>(() => {
    if (initialCachedState) return 'ready';
    return shouldFetchAdmin || shouldFetchPublic ? 'loading' : 'ready';
  });
  const [error, setError] = useState<CmsContextValue['error']>(null);

  const fetchWithRefresh = useCallback(
    async (mode: 'core' | 'full' = 'full') => {
      let token = dataToken;
      try {
        return await fetchCmsState(token, token ? { mode } : undefined);
      } catch (loadError) {
        if (!isExpiredAuthError(loadError)) throw loadError;
        token = await refreshSession();
        if (!token) {
          signOut();
          throw new Error('Session expired. Please sign in again.');
        }
        return fetchCmsState(token, { mode });
      }
    },
    [dataToken, refreshSession, signOut],
  );

  const refreshWorkspace = useCallback(async () => {
    if (!shouldFetchAdmin && !shouldFetchPublic) {
      setStatus('ready');
      setError(null);
      return;
    }
    const next = await fetchWithRefresh('full');
    rawDispatch({ type: 'HYDRATE', payload: next });
    if (shouldFetchAdmin) writeAdminStateCache(adminUserKey, next);
    if (shouldFetchPublic) writePublicStateCache(next);
    setStatus('ready');
    setError(null);
  }, [adminUserKey, fetchWithRefresh, shouldFetchAdmin, shouldFetchPublic]);

  useEffect(() => {
    let cancelled = false;
    const cached = shouldFetchAdmin ? readAdminStateCache(adminUserKey) : shouldFetchPublic ? readPublicStateCache() : null;
    if (cached) {
      rawDispatch({ type: 'HYDRATE', payload: cached });
      setStatus('ready');
      setError(null);
    } else if (shouldFetchAdmin || shouldFetchPublic) {
      setStatus('loading');
      setError(null);
    } else {
      setStatus('ready');
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    const initialMode: 'core' | 'full' = shouldFetchAdmin && !cached ? 'core' : 'full';
    fetchWithRefresh(initialMode)
      .then((next) => {
        if (cancelled) return;
        rawDispatch({ type: 'HYDRATE', payload: next });
        if (shouldFetchAdmin) writeAdminStateCache(adminUserKey, next);
        if (shouldFetchPublic) writePublicStateCache(next);
        setStatus('ready');
        setError(null);

        // Follow up core boot with a full workspace sync in the background.
        if (shouldFetchAdmin && initialMode === 'core') {
          void fetchWithRefresh('full')
            .then((fullState) => {
              if (cancelled) return;
              rawDispatch({ type: 'HYDRATE', payload: fullState });
              writeAdminStateCache(adminUserKey, fullState);
            })
            .catch(() => {
              /* keep core state if full sync fails */
            });
        }
      })
      .catch((loadError) => {
        if (cancelled) return;
        if (cached) {
          setStatus('ready');
          return;
        }
        const classified = classifyLoadError(loadError);
        setStatus('offline');
        setError(classified);
        toast.error(classified.message);
      });
    return () => {
      cancelled = true;
    };
  }, [adminUserKey, fetchWithRefresh, shouldFetchAdmin, shouldFetchPublic]);

  const dispatch = useCallback(
    (action: CmsAction) => {
      if (action.type === 'HYDRATE' || action.type === 'POST_DETAIL_HYDRATE') {
        rawDispatch(action);
        return;
      }

      const minimumRole = ACTION_MIN_ROLE[action.type];
      if (minimumRole && !hasMinimumRole(user?.role, minimumRole)) {
        toast.error(`${minimumRole[0]}${minimumRole.slice(1).toLowerCase()} access is required for this action.`);
        return;
      }

      rawDispatch({ ...(action as Record<string, unknown>), actor } as CmsAction);
      void (async () => {
        try {
          await syncCmsAction(action, dataToken, state);
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
    [dataToken, actor, refreshSession, refreshWorkspace, signOut, state, user?.role],
  );

  const resetWorkspace = useCallback(() => {
    void refreshWorkspace().catch((loadError) => {
      setStatus('offline');
      setError(classifyLoadError(loadError));
    });
  }, [refreshWorkspace]);

  const value = useMemo(() => ({ state, status, error, dispatch, resetWorkspace }), [state, status, error, dispatch, resetWorkspace]);

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
  sessionStorage.removeItem('phulpur24_workspace_reset_preview');
  window.location.reload();
}
