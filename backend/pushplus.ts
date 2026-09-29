export async function notifyPushPlus(title: string, content: string): Promise<boolean> {
  const token = process.env.FEEDBACK_PUSHPLUS_TOKEN?.trim();
  if (!token) return false;

  try {
    const res = await fetch('https://www.pushplus.plus/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        title,
        content,
        template: 'txt'
      })
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { code?: number };
    return data.code === 200;
  } catch {
    return false;
  }
}
