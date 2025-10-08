'use client';

import { useMemo, useState } from 'react';
import type { FilterState } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  value?: FilterState;
  onChange: (next: FilterState) => void;
  onApply?: () => void;
  onClear?: () => void;
  onAskAI?: (query: string) => Promise<Partial<FilterState>>;
};

export function TransactionsSearchFilter({ value, onChange, onApply, onClear, onAskAI }: Props) {
  const current = useMemo<FilterState>(() => ({ limit: 50, ...(value || {}) }), [value]);
  const [aiQuery, setAiQuery] = useState('');

  const patch = (p: Partial<FilterState>) => onChange({ ...current, ...p });

  const runAI = async () => {
    if (!onAskAI || !aiQuery.trim()) return;
    try {
      const parsed = await onAskAI(aiQuery.trim());
      patch(parsed);
      setAiQuery('');
    } catch {
      // no-op; caller can surface a toast
    }
  };

  return (
    <div className="flex w-full flex-col gap-2">
      {/* Top bar — search + AI */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search transactions (description, client, reference)"
          value={current.search || ''}
          onChange={(e) => patch({ search: e.target.value })}
          className="h-8 max-w-[380px]"
        />
        <div className="flex items-center gap-2">
          <Input
            placeholder="Ask AI e.g. payments last week > 100 tagged rent"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            className="h-8 w-[360px]"
          />
          <Button size="sm" variant="secondary" onClick={runAI}>Parse</Button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => (onClear ? onClear() : onChange({ limit: 50 }))}>Clear</Button>
          <Button size="sm" onClick={() => onApply?.()}>Apply</Button>
        </div>
      </div>

      {/* Placeholder: advanced controls will be moved into a Sheet matching Midday UX */}
      <div className="text-xs text-muted-foreground">
        Advanced filters (date range, status, attachments, recurring, categories, accounts, assignees, tags, amount range) will appear here.
      </div>
    </div>
  );
}

export default TransactionsSearchFilter;
