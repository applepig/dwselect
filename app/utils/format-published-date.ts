export function formatPublishedDate(published_at: string | null) {
  if (published_at === null) {
    return '未標日期'
  }

  return new Intl.DateTimeFormat('zh-Hant-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Taipei',
  }).format(new Date(published_at))
}
