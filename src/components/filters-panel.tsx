"use client";

interface FiltersPanelProps {
  minRating: number;
  minReviewsPerMonth: number;
  onMinRatingChange: (value: number) => void;
  onMinReviewsPerMonthChange: (value: number) => void;
  disabled?: boolean;
}

export default function FiltersPanel({
  minRating,
  minReviewsPerMonth,
  onMinRatingChange,
  onMinReviewsPerMonthChange,
  disabled,
}: FiltersPanelProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="minRating"
          className="text-sm font-medium text-zinc-400"
        >
          Min Star Rating
        </label>
        <select
          id="minRating"
          value={minRating}
          onChange={(e) => onMinRatingChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
        >
          <option value={0}>Any</option>
          <option value={1}>1+ Stars</option>
          <option value={2}>2+ Stars</option>
          <option value={3}>3+ Stars</option>
          <option value={3.5}>3.5+ Stars</option>
          <option value={4}>4+ Stars</option>
          <option value={4.5}>4.5+ Stars</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="minReviews"
          className="text-sm font-medium text-zinc-400"
        >
          Min Reviews / Month
        </label>
        <input
          id="minReviews"
          type="number"
          min={0}
          value={minReviewsPerMonth}
          onChange={(e) =>
            onMinReviewsPerMonthChange(parseInt(e.target.value, 10) || 0)
          }
          disabled={disabled}
          className="w-32 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
        />
      </div>
    </div>
  );
}
