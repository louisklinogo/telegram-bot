'use client';

import { useMemo } from 'react';
import type { FilterState } from './types';
import { Input } from '@/components/ui/input';

type Props = {
  value?: FilterState;
  onChange: (next: FilterState) => void;
  onAskAI?: (query: string) => Promise<Partial<FilterState>>;
};

export function TransactionsSearchFilter({ value, onChange, onAskAI }: Props) {
  const current = useMemo<FilterState>(() => ({ limit: 50, ...(value || {}) }), [value]);

  const patch = (p: Partial<FilterState>) => onChange({ ...current, ...p });

  return (
    <div className="flex w-full items-center gap-2">
      <Input
        placeholder="Search transactions by description, client, or reference..."
        value={current.search || ''}
        onChange={(e) => patch({ search: e.target.value })}
        onKeyDown={async (e) => {
          if (e.key === 'Enter' && onAskAI && (current.search || '').trim()) {
            try {
              const parsed = await onAskAI((current.search || '').trim());
              if (parsed && Object.keys(parsed).length > 0) patch(parsed);
            } catch {}
          }
        }}
        className="h-6 w-[360px] border-none bg-transparent p-0 text-sm focus-visible:ring-0"
      />
    </div>
  );
}

export default TransactionsSearchFilter;
