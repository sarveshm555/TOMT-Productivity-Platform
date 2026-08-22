/**
 * Formats a UTC Date / ISO string / Date object into the user's browser local timezone.
 * Returns formatted string like "22 Aug 2026 at 01:55 PM".
 * Prefers dateTimeVal (UTC timestamp) over displayDateTimeFallback.
 */
export function formatLocalDateTime(dateTimeVal, displayDateTimeFallback = '') {
  if (dateTimeVal) {
    const date = new Date(dateTimeVal);
    if (!isNaN(date.getTime())) {
      const day = date.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();

      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;

      const formattedHours = hours.toString().padStart(2, '0');

      return `${day} ${month} ${year} at ${formattedHours}:${minutes} ${ampm}`;
    }
  }

  return displayDateTimeFallback || '';
}
