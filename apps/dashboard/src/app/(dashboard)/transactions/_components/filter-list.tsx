'use client';

import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import type { FilterState } from './types';

type Props = {
  filters: FilterState;
  onRemoveFilter: (key: string, value?: string) => void;
  onClearAll: () => void;
  loading?: boolean;
  currency?: string;
};

interface FilterBadgeProps {
  label: string;
  onRemove: () => void;
  icon?: React.ComponentType<any>;
}

function FilterBadge({ label, onRemove, icon: Icon }: FilterBadgeProps) {
  return (
    <Badge 
      variant="secondary" 
      className="flex items-center gap-1 text-xs cursor-pointer hover:bg-secondary/80"
      onClick={onRemove}
    >
      {Icon && <Icon className="h-3 w-3" />}
      <span>{label}</span>
      <Icons.X className="h-3 w-3 hover:text-destructive" />
    </Badge>
  );
}

export function FilterList({ filters, onRemoveFilter, onClearAll, loading = false, currency = "GHS" }: Props) {
  const filterBadges: React.ReactNode[] = [];

  // Date range
  if (filters.startDate || filters.endDate) {
    const label = filters.startDate && filters.endDate 
      ? `${formatDate(filters.startDate)} - ${formatDate(filters.endDate)}`
      : filters.startDate 
        ? `From ${formatDate(filters.startDate)}`
        : `Until ${formatDate(filters.endDate!)}`;
    
    filterBadges.push(
      <FilterBadge
        key="date-range"
        label={label}
        icon={Icons.CalendarMonth}
        onRemove={() => {
          onRemoveFilter('startDate');
          onRemoveFilter('endDate');
        }}
      />
    );
  }

  // Amount range
  if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
    const label = filters.amountMin !== undefined && filters.amountMax !== undefined
      ? `${currency} ${filters.amountMin} - ${currency} ${filters.amountMax}`
      : filters.amountMin !== undefined
        ? `From ${currency} ${filters.amountMin}`
        : `Up to ${currency} ${filters.amountMax}`;
    
    filterBadges.push(
      <FilterBadge
        key="amount-range"
        label={label}
        icon={Icons.Currency}
        onRemove={() => {
          onRemoveFilter('amountMin');
          onRemoveFilter('amountMax');
        }}
      />
    );
  }

  // Statuses
  if (filters.statuses?.length) {
    filterBadges.push(
      ...filters.statuses.map(status => (
        <FilterBadge
          key={`status-${status}`}
          label={status.charAt(0).toUpperCase() + status.slice(1)}
          icon={Icons.Status}
          onRemove={() => onRemoveFilter('statuses', status)}
        />
      ))
    );
  }

  // Attachments
  if (filters.hasAttachments !== undefined) {
    filterBadges.push(
      <FilterBadge
        key="attachments"
        label={filters.hasAttachments ? 'Has attachments' : 'No attachments'}
        icon={Icons.Attachments}
        onRemove={() => onRemoveFilter('hasAttachments')}
      />
    );
  }

  // Categories
  if (filters.categories?.length) {
    filterBadges.push(
      ...filters.categories.map(category => (
        <FilterBadge
          key={`category-${category}`}
          label={category}
          icon={Icons.Category}
          onRemove={() => onRemoveFilter('categories', category)}
        />
      ))
    );
  }

  // Tags
  if (filters.tags?.length) {
    filterBadges.push(
      ...filters.tags.map(tag => (
        <FilterBadge
          key={`tag-${tag}`}
          label={tag}
          icon={Icons.Status}
          onRemove={() => onRemoveFilter('tags', tag)}
        />
      ))
    );
  }

  // Accounts
  if (filters.accounts?.length) {
    filterBadges.push(
      ...filters.accounts.map(account => (
        <FilterBadge
          key={`account-${account}`}
          label={account}
          icon={Icons.Accounts}
          onRemove={() => onRemoveFilter('accounts', account)}
        />
      ))
    );
  }

  // Assignees
  if (filters.assignees?.length) {
    filterBadges.push(
      ...filters.assignees.map(assignee => (
        <FilterBadge
          key={`assignee-${assignee}`}
          label={assignee}
          icon={Icons.AccountCircle}
          onRemove={() => onRemoveFilter('assignees', assignee)}
        />
      ))
    );
  }

  // Recurring
  if (filters.isRecurring !== undefined) {
    filterBadges.push(
      <FilterBadge
        key="recurring"
        label={filters.isRecurring ? 'Recurring' : 'Not recurring'}
        icon={Icons.Repeat}
        onRemove={() => onRemoveFilter('isRecurring')}
      />
    );
  }

  if (filterBadges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {loading && (
        <div className="flex items-center gap-2">
          <Icons.Refresh className="h-3 w-3 animate-spin" />
          <span className="text-xs text-muted-foreground">Updating filters...</span>
        </div>
      )}
      {filterBadges}
      {filterBadges.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  } catch {
    return dateStr;
  }
}

export default FilterList;
