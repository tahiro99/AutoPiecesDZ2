import { apiGet, apiPatch, apiPost } from "./api.client";

export async function createNotif() {
  // Les notifications sont créées côté serveur
}

// Pas d'écoute permanente : on charge, puis on rafraîchit périodiquement
export function listenNotifs(userId, callback) {
  let stopped = false;

  const load = async () => {
    try {
      const items = await apiGet("/notifications");
      if (!stopped) callback(items || []);
    } catch (e) {
      if (!stopped) callback([]);
    }
  };

  load();
  const timer = setInterval(load, 30000);

  return () => { stopped = true; clearInterval(timer); };
}

export async function markRead(userId, notifId) {
  await apiPatch(`/notifications/${notifId}/read`);
}

export async function markAllRead(userId) {
  await apiPost("/notifications/read-all");
}