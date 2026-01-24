'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ItemsPerPageSelectorProps {
  value: number;
  onChange: (value: number) => void;
  options?: number[];
  label?: string;
  className?: string;
}

const DEFAULT_OPTIONS = [10, 20, 30, 50, 100];

export function ItemsPerPageSelector({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  label = 'Items per page',
  className = '',
}: ItemsPerPageSelectorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Label htmlFor="items-per-page" className="text-sm whitespace-nowrap">
        {label}
      </Label>
      <Select
        value={String(value)}
        onValueChange={(val) => onChange(Number(val))}
      >
        <SelectTrigger id="items-per-page" className="w-[100px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
