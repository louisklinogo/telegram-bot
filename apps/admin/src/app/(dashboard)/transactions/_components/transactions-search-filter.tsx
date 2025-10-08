'use client';

import { useMemo } from 'react';
import type { FilterState } from './types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter as FilterIcon } from 'lucide-react';
import { useState } from 'react';

type Props = {
  value?: FilterState;
  onChange: (next: FilterState) => void;
  onAskAI?: (query: string) => Promise<Partial<FilterState>>;
};

export function TransactionsSearchFilter({ value, onChange, onAskAI }: Props) {
  const current = useMemo<FilterState>(() => ({ limit: 50, ...(value || {}) }), [value]);
  const [open, setOpen] = useState(false);

  const patch = (p: Partial<FilterState>) => onChange({ ...current, ...p });

  return (
    <div className="relative flex w-full items-center gap-2">
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
        className="h-6 w-[360px] border-none bg-transparent p-0 text-sm focus-visible:ring-0 pr-6"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-6 w-6 opacity-60 hover:opacity-100">
            <FilterIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-3">
          <div className="space-y-3 text-xs">
            <div>
              <div className="mb-1 text-[11px] text-muted-foreground">Type</div>
              <div className="flex flex-wrap gap-2">
                {(['payment','expense','refund','adjustment'] as const).map(t => (
                  <Button key={t} size="sm" variant={current.type===t? 'default':'outline'} className="h-7 px-2 capitalize" onClick={() => patch({ type: current.type===t? undefined : t })}>{t}</Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="mb-1 text-[11px] text-muted-foreground">From</div>
                <Input type="date" value={current.startDate ? new Date(current.startDate).toISOString().slice(0,10): ''} onChange={(e)=>patch({ startDate: e.target.value ? new Date(e.target.value+'T00:00:00Z').toISOString(): undefined })} />
              </div>
              <div>
                <div className="mb-1 text-[11px] text-muted-foreground">To</div>
                <Input type="date" value={current.endDate ? new Date(current.endDate).toISOString().slice(0,10): ''} onChange={(e)=>patch({ endDate: e.target.value ? new Date(e.target.value+'T23:59:59Z').toISOString(): undefined })} />
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] text-muted-foreground">Status</div>
              <div className="flex flex-wrap gap-3">
                {(['pending','completed','failed','cancelled'] as const).map(s => {
                  const list = current.statuses || (current as any).status || [];
                  const checked = list.includes(s as any);
                  return (
                    <label key={s} className="flex items-center gap-2"><Checkbox checked={checked} onCheckedChange={(v)=>{
                      const prev = new Set(list);
                      if (v) prev.add(s as any); else prev.delete(s as any);
                      patch({ statuses: Array.from(prev) as any });
                    }} /> <span className="capitalize">{s}</span></label>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] text-muted-foreground">Attachments</div>
              <div className="flex items-center gap-2">
                {(['any','with','without'] as const).map(opt => (
                  <Button key={opt} size="sm" variant={(current.hasAttachments===undefined && opt==='any') || (current.hasAttachments===true && opt==='with') || (current.hasAttachments===false && opt==='without') ? 'default':'outline'} className="h-7 px-2" onClick={()=>patch({ hasAttachments: opt==='any' ? undefined : (opt==='with') })}>{opt}</Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={!!current.isRecurring} onCheckedChange={(v)=>patch({ isRecurring: !!v })} />
              <span>Recurring only</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="mb-1 text-[11px] text-muted-foreground">Min</div>
                <Input type="number" value={current.amountMin ?? ''} onChange={(e)=>patch({ amountMin: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
              <div>
                <div className="mb-1 text-[11px] text-muted-foreground">Max</div>
                <Input type="number" value={current.amountMax ?? ''} onChange={(e)=>patch({ amountMax: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Input placeholder="Category slugs (comma)" value={(current.categories||[]).join(',')} onChange={(e)=>patch({ categories: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} />
              <Input placeholder="Account IDs (comma)" value={(current.accounts||[]).join(',')} onChange={(e)=>patch({ accounts: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} />
              <Input placeholder="Assignee IDs (comma)" value={(current.assignees||[]).join(',')} onChange={(e)=>patch({ assignees: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} />
              <Input placeholder="Tag IDs (comma)" value={(current.tags||[]).join(',')} onChange={(e)=>patch({ tags: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} />
            </div>
            <div className="flex items-center justify-between pt-1">
              <Button variant="ghost" size="sm" onClick={()=>{ patch({ type: undefined, statuses: [], categories: [], tags: [], accounts: [], assignees: [], hasAttachments: undefined, isRecurring: undefined, amountMin: undefined, amountMax: undefined, startDate: undefined, endDate: undefined }); }}>Clear</Button>
              <Button size="sm" onClick={()=> setOpen(false)}>Apply</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default TransactionsSearchFilter;
