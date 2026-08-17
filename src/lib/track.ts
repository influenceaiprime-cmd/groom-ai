import { supabase } from './db';

export function getVisitorId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem('glamai_vid');
  if (!id) {
    id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem('glamai_vid', id);
  }
  return id;
}

// Fire-and-forget live event tracking
export function track(event: string, meta?: Record<string, unknown>) {
  if (!supabase) return;
  try {
    supabase
      .from('events')
      .insert({ event, meta: meta || {}, visitor: getVisitorId() })
      .then(
        () => {}, 
        () => {} // catches errors safely for PromiseLike
      );
  } catch (e) {}
}
