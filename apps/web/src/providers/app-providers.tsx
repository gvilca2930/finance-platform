'use client';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '@/lib/api/auth';
import { tokens } from '@/lib/api/client';
import { workspacesApi } from '@/lib/api/workspaces';
import type { AuthTokens, User, WorkspaceMembership } from '@/types/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  setSession: (data: AuthTokens) => void;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
interface WorkspaceContextValue {
  memberships: WorkspaceMembership[];
  current: WorkspaceMembership | null;
  loading: boolean;
  select: (id: string) => void;
  reload: () => Promise<void>;
}
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const WORKSPACE_KEY = 'finance.workspace';

function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [authenticated, setAuthenticated] = useState(() =>
    Boolean(tokens.access() || tokens.refresh()),
  );
  const me = useQuery({
    queryKey: ['auth-me'],
    queryFn: authApi.me,
    enabled: authenticated,
    retry: false,
  });
  const user = me.data ?? null;
  const loading = authenticated && me.isLoading;
  const reloadUser = useCallback(async () => {
    await me.refetch();
  }, [me]);
  useEffect(() => {
    const unauthorized = () => {
      setAuthenticated(false);
      queryClient.clear();
      router.replace('/login');
    };
    window.addEventListener('finance:unauthorized', unauthorized);
    return () => window.removeEventListener('finance:unauthorized', unauthorized);
  }, [queryClient, router]);
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      setSession: (data) => {
        tokens.set(data.accessToken, data.refreshToken);
        setAuthenticated(true);
        queryClient.setQueryData(['auth-me'], data.user);
      },
      reloadUser,
      logout: async () => {
        await authApi.logout();
        setAuthenticated(false);
        queryClient.clear();
        router.replace('/login');
      },
    }),
    [user, loading, reloadUser, queryClient, router],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspacesApi.list,
    enabled: Boolean(user),
  });
  const memberships = useMemo(() => query.data ?? [], [query.data]);
  const [selected, setSelected] = useState<string | null>(null);
  const select = useCallback(
    (id: string) => {
      sessionStorage.setItem(WORKSPACE_KEY, id);
      setSelected(id);
      void queryClient.invalidateQueries({
        predicate: (item) => item.queryKey[0] !== 'workspaces',
      });
    },
    [queryClient],
  );
  const stored = typeof window === 'undefined' ? null : sessionStorage.getItem(WORKSPACE_KEY);
  const current =
    memberships.find((item) => item.workspaceId === selected) ??
    memberships.find((item) => item.workspaceId === stored) ??
    memberships[0] ??
    null;
  const reload = useCallback(async () => {
    await query.refetch();
  }, [query]);
  const value = useMemo<WorkspaceContextValue>(
    () => ({ memberships, current, loading: query.isLoading, select, reload }),
    [memberships, current, query.isLoading, select, reload],
  );
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: 0 },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be inside provider');
  return value;
}
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be inside provider');
  return value;
}
