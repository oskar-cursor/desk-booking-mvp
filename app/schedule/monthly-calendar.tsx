"use client";

interface MonthlyCalendarProps {
  year: number;
  month: number; // 1-12
  presenceData: Record<string, "HOME" | "OFFICE" | "ABSENT">;
  selectedDates: Set<string>;
  onToggleDate: (date: string) => void;
  onSelectWeekday: (weekday: number) => void;
}

const WEEKDAY_LABELS = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Ndz"];

function getModeIndicator(mode: "HOME" | "OFFICE" | "ABSENT" | undefined) {
  switch (mode) {
    case "OFFICE":
      return <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />;
    case "HOME":
      return <span className="w-2.5 h-2.5 rounded-full border-2 border-gray-400 inline-block" />;
    case "ABSENT":
      return <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />;
    default:
      return null;
  }
}

function getModeLabel(mode: "HOME" | "OFFICE" | "ABSENT" | undefined) {
  switch (mode) {
    case "OFFICE":
      return "OFF";
    case "HOME":
      return "HOM";
    case "ABSENT":
      return "ABS";
    default:
      return "";
  }
}

export default function MonthlyCalendar({
  year,
  month,
  presenceData,
  selectedDates,
  onToggleDate,
  onSelectWeekday,
}: MonthlyCalendarProps) {
  const today = new Date().toISOString().slice(0, 10);

  // Build calendar grid
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  // Monday=0 ... Sunday=6
  let startWeekday = firstDay.getUTCDay() - 1;
  if (startWeekday < 0) startWeekday = 6;

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = new Array(startWeekday).fill(null);

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  function dateStr(day: number): string {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function isWeekend(day: number): boolean {
    const d = new Date(Date.UTC(year, month - 1, day));
    const dow = d.getUTCDay();
    return dow === 0 || dow === 6;
  }

  function isPast(day: number): boolean {
    return dateStr(day) < today;
  }

  return (
    <div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((label, i) => (
          <button
            key={label}
            onClick={() => {
              if (i < 5) onSelectWeekday(i);
            }}
            disabled={i >= 5}
            className={`text-center text-xs font-semibold py-2 rounded ${
              i < 5
                ? "text-gray-700 hover:bg-gray-100 cursor-pointer"
                : "text-gray-400 cursor-default"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Calendar grid */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
          {week.map((day, di) => {
            if (day === null) {
              return <div key={di} className="h-16" />;
            }

            const ds = dateStr(day);
            const weekend = isWeekend(day);
            const past = isPast(day);
            const disabled = weekend || past;
            const selected = selectedDates.has(ds);
            const mode = presenceData[ds] as "HOME" | "OFFICE" | "ABSENT" | undefined;

            return (
              <button
                key={di}
                type="button"
                onClick={() => {
                  if (!disabled) onToggleDate(ds);
                }}
                disabled={disabled}
                className={`h-16 rounded-lg border text-sm flex flex-col items-center justify-center gap-0.5 transition-all ${
                  disabled
                    ? "bg-gray-50 border-gray-200 text-gray-400 cursor-default opacity-50"
                    : selected
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500 cursor-pointer"
                      : "border-gray-200 hover:border-gray-400 cursor-pointer"
                }`}
              >
                <span className="font-medium">{day}</span>
                <span className="flex items-center gap-1">
                  {getModeIndicator(mode)}
                  <span className="text-[10px]">{getModeLabel(mode)}</span>
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
