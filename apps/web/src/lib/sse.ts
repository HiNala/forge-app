import { fetchEventSource } from '@microsoft/fetch-event-source';
import { getApiUrl } from './api';

export const streamGeneration = async (
  endpoint: string,
  body: any,
  onMessage: (event: string, data: any) => void
) => {
  await fetchEventSource(`${getApiUrl()}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify(body),
    onmessage(ev) {
      if (ev.event && ev.data) {
        onMessage(ev.event, JSON.parse(ev.data));
      }
    },
    onerror(err) {
      console.error("SSE Error:", err);
      throw err;
    }
  });
};
