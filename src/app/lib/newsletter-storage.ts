import { apiRequest } from './api-client';

const STORAGE_KEY = 'phulpur24_newsletter_subscribers';

export async function recordNewsletterSignup(email: string, source: string): Promise<void> {
  await apiRequest('/public/newsletter', {
    method: 'POST',
    body: JSON.stringify({ email, source }),
  });

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: { email: string; source: string; at: string }[] = raw ? JSON.parse(raw) : [];
    list.push({ email: email.toLowerCase().trim(), source, at: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-200)));
  } catch {
    /* ignore quota / private mode */
  }
}
