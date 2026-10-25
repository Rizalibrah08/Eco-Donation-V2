import { useState } from 'react';
import api, { getErrorMessage } from '../services/api';
import { useAuthStore } from '../store/auth';
import { refreshMe } from '../services/user';
import { toast } from '../ui';

type Target =
  | { campaign_id: number }
  | { source: 'everyorg'; external_id: string; title: string; image_url?: string };

// Alur donasi bersama untuk kampanye lokal dan global.
export function useDonate(target: Target | null, onDone?: () => void) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<number | null>(null);

  const submit = async (points: number) => {
    if (!target) return;
    setLoading(true);
    try {
      const { data } = await api.post('/donations', { ...target, points });
      useAuthStore.getState().updateUser({ points: data.balance });
      setOpen(false);
      setSuccess(points);
      refreshMe();
      onDone?.();
    } catch (err) {
      toast.error('Donasi gagal', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return { open, setOpen, loading, submit, success, clearSuccess: () => setSuccess(null) };
}
