import { adminText } from '@/pages/admin/adminLocale';
import { useCallback, useEffect, useRef, useState } from 'react';

export function adminError(error: unknown): string {
  const response = (
    error as { response?: { status?: number; data?: { message?: string } } }
  )?.response;
  if (response?.status === 403)
    return adminText("Bạn chưa có quyền thực hiện thao tác này.");
  return (
    response?.data?.message || adminText("Không thể kết nối dữ liệu. Vui lòng thử lại.")
  );
}

/** Each route owns its request; stale responses cannot overwrite newer filters. */
export function useAdminResource<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const reload = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const value = await loader();
      if (id === request.current) setData(value);
    } catch (cause) {
      if (id === request.current) setError(adminError(cause));
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [loader]);
  useEffect(() => {
    void reload();
    return () => {
      request.current++;
    };
  }, [reload]);
  return { data, loading, error, reload, setData };
}
