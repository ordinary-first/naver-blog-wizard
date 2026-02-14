export const toSlug = (value) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

export const createPostSlug = (title) => {
  const base = toSlug(title) || 'untitled';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
};

export const formatDate = (value) => {
  if (!value) return '-';

  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

