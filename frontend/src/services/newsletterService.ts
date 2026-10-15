import api from '@/lib/axios';

interface NewsletterResponse { success: boolean; message: string }
export const newsletterService = {
  async subscribe(email: string) {
    return (await api.post<NewsletterResponse>('/newsletter/subscribe', { email })).data;
  },
  async complete(action: 'confirm' | 'unsubscribe', token: string, signal?: AbortSignal) {
    return (await api.post<NewsletterResponse>(`/newsletter/${action}`, { token }, { signal })).data;
  },
};
