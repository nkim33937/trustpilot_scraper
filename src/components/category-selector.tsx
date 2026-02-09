"use client";

import { Category } from "@/lib/types";

interface CategorySelectorProps {
  categories: Category[];
  selectedCategory: string;
  onSelect: (slug: string) => void;
  disabled?: boolean;
}

export default function CategorySelector({
  categories,
  selectedCategory,
  onSelect,
  disabled,
}: CategorySelectorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="category"
        className="text-sm font-medium text-zinc-400"
      >
        TrustPilot Category
      </label>
      <select
        id="category"
        value={selectedCategory}
        onChange={(e) => onSelect(e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
      >
        <option value="">Select a category...</option>
        {categories.map((cat) => (
          <optgroup key={cat.slug} label={cat.name}>
            <option value={cat.slug}>{cat.name} (All)</option>
            {cat.children?.map((child) => (
              <option key={child.slug} value={child.slug}>
                {child.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
