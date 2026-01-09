export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeekDates(referenceDate: Date): Date[] {
  const dates: Date[] = [];
  const day = referenceDate.getDay();
  const startOfWeek = new Date(referenceDate);
  startOfWeek.setDate(referenceDate.getDate() - day);

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    dates.push(date);
  }

  return dates;
}

export function getMonthDates(year: number, month: number): (Date | null)[][] {
  const weeks: (Date | null)[][] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();

  let currentWeek: (Date | null)[] = [];

  // Fill in empty days before the first day of the month
  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push(null);
  }

  // Fill in the days of the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    currentWeek.push(new Date(year, month, day));

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Fill in empty days after the last day of the month
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

export function getYearMonths(year: number): { month: number; weeks: (Date | null)[][] }[] {
  const months: { month: number; weeks: (Date | null)[][] }[] = [];

  for (let month = 0; month < 12; month++) {
    months.push({
      month,
      weeks: getMonthDates(year, month),
    });
  }

  return months;
}

export function getMonthName(month: number): string {
  return new Date(2000, month, 1).toLocaleString('default', { month: 'long' });
}

export function getShortMonthName(month: number): string {
  return new Date(2000, month, 1).toLocaleString('default', { month: 'short' });
}

export function getDayName(day: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[day];
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return formatDate(date1) === formatDate(date2);
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function isFutureDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate > today;
}
