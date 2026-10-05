export function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  return (
    dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' +
    dt.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })
  );
}

// "Tomorrow" / "Today" / formatted date for appointment tokens.
export function friendlyDay(d) {
  if (!d) return '';
  const dt = new Date(d);
  const startOf = (x) => {
    const c = new Date(x);
    c.setHours(0, 0, 0, 0);
    return c.getTime();
  };
  const today = startOf(new Date());
  const day = startOf(dt);
  const diffDays = Math.round((day - today) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return formatDate(dt);
}

export function toISODate(d) {
  const c = new Date(d);
  return `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, '0')}-${String(c.getDate()).padStart(2, '0')}`;
}

export function firstName(fullName) {
  return (fullName || '').trim().split(/\s+/)[0] || 'there';
}
