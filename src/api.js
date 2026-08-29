/* Fixed for this deployment — every device, every login (employee or
   manager) uses this same backend automatically. Nothing to configure.
   If you ever redeploy the Apps Script as a brand-new deployment (not
   just "New version" on the existing one), update this URL. */
const BAAZ_API_BASE = 'https://script.google.com/macros/s/AKfycbz3GdN-lrKTtD7dOL8usQd9MK3Swpqxf2ynqWgrOAcGnxwjtVdegixqFQEslt3D0Ny8/exec';

export async function apiCall(action, payload, token) {
  payload = payload || {};
  if (token) payload.token = token;
  // GET, not POST: Apps Script's cross-origin support is reliable for GET
  // but frequently strips the CORS header on POST responses, which the
  // browser then reports as a CORS error even though the request itself
  // ran fine on the server.
  const url = BAAZ_API_BASE + '?data=' + encodeURIComponent(JSON.stringify({ action, payload }));
  if (url.length > 7500) {
    throw new Error('That file/image is too large to send. Try a smaller image or a shorter CSV.');
  }
  let res;
  try {
    res = await fetch(url, { method: 'GET' });
  } catch (err) {
    throw new Error('Could not reach the backend. Check your internet connection.');
  }
  let data;
  try {
    data = await res.json();
  } catch (err) {
    throw new Error('Backend returned something unexpected. Check the Apps Script deployment.');
  }
  if (!data.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
