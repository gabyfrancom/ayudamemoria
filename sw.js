const CACHE = 'am-v1';
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'sync') {
    const { startAt, alarms } = e.data;
    scheduleReminder(startAt, alarms);
  }
});

let reminderTimer = null;
let alarmTimers = [];

function scheduleReminder(startAt, alarms) {
  if (reminderTimer) clearTimeout(reminderTimer);
  if (alarmTimers.length) { alarmTimers.forEach(t => clearTimeout(t)); alarmTimers = []; }

  if (startAt) {
    const elapsed = Date.now() - startAt;
    const nextIn = Math.max(0, 600000 - (elapsed % 600000));
    reminderTimer = setTimeout(() => {
      showReminderNotification();
      scheduleReminder(Date.now(), alarms);
    }, nextIn);
  }

  if (alarms && alarms.length) {
    alarms.forEach(a => {
      if (a.triggered) return;
      const t = new Date(a.datetime).getTime() - Date.now();
      if (t > 0) {
        const id = setTimeout(() => {
          showAlarmNotification(a);
        }, t);
        alarmTimers.push(id);
      }
    });
  }
}

async function showReminderNotification() {
  const clientsList = await self.clients.matchAll({ type: 'window' });
  if (clientsList.length > 0) {
    clientsList[0].postMessage({ type: 'reminder' });
    return;
  }
  self.registration.showNotification('Ayuda Memoria', {
    body: 'Tienes pendientes por revisar',
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"%3E%3Crect width="192" height="192" rx="32" fill="%230a0e1a"/%3E%3Ctext x="96" y="128" text-anchor="middle" font-size="100" fill="%23818cf8"%3E📋%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"%3E%3Crect width="96" height="96" rx="16" fill="%230a0e1a"/%3E%3Ctext x="48" y="64" text-anchor="middle" font-size="48" fill="%23818cf8"%3E📋%3C/text%3E%3C/svg%3E',
    requireInteraction: true,
    tag: 'ayuda-memoria-reminder'
  });
}

async function showAlarmNotification(alarm) {
  const clientsList = await self.clients.matchAll({ type: 'window' });
  if (clientsList.length > 0) {
    clientsList[0].postMessage({ type: 'alarm', alarm });
    return;
  }
  self.registration.showNotification('Alarma: ' + alarm.text, {
    body: 'Categor\u00eda: ' + alarm.category,
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"%3E%3Crect width="192" height="192" rx="32" fill="%230a0e1a"/%3E%3Ctext x="96" y="128" text-anchor="middle" font-size="100" fill="%23fbbf24"%3E⏰%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"%3E%3Crect width="96" height="96" rx="16" fill="%230a0e1a"/%3E%3Ctext x="48" y="64" text-anchor="middle" font-size="48" fill="%23fbbf24"%3E⏰%3C/text%3E%3C/svg%3E',
    requireInteraction: true,
    tag: 'ayuda-memoria-alarm-' + alarm.id,
    data: { alarmId: alarm.id }
  });
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const urlToOpen = '/';
  const promise = clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    if (windows.length > 0) { windows[0].focus(); return; }
    return clients.openWindow(urlToOpen);
  });
  e.waitUntil(promise);
});
