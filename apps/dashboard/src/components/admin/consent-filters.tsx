'use client';

import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface ConsentFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  provider: string;
  onProviderChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
}

export function ConsentFilters({
  search,
  onSearchChange,
  provider,
  onProviderChange,
  status,
  onStatusChange,
}: ConsentFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search consents..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-xs"
      />
      <Select value={provider} onChange={(e) => onProviderChange(e.target.value)} className="w-40">
        <option value="">All providers</option>
        <option value="fortnox">Fortnox</option>
        <option value="visma">Visma eEkonomi</option>
        <option value="bokio">Bokio</option>
        <option value="bjornlunden">Bjorn Lunden</option>
        <option value="sie-upload">Manual SIE Upload</option>
      </Select>
      <Select value={status} onChange={(e) => onStatusChange(e.target.value)} className="w-36">
        <option value="">All statuses</option>
        <option value="0">Created</option>
        <option value="1">Accepted</option>
        <option value="2">Revoked</option>
        <option value="3">Inactive</option>
      </Select>
    </div>
  );
}
