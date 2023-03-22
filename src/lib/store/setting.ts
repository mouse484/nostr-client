// import { browser, dev } from '$app/environment';
import { browser, dev } from '$app/environment';
import { defaultRelays, mouseNpubKey } from '$lib/data/const';
import { pool } from '$lib/utils/nostr';
// import { subscribeEvents } from '$lib/utils/nostr';
import { createQuery } from '@tanstack/svelte-query';
import { get, writable } from 'svelte/store';
import { z } from 'zod';

export const usePubkey = () => {
	const query = createQuery<string>(['pubkey'], {
		queryFn: () => {
			const localPubkey = localStorage.getItem('pubkey');
			return localPubkey || '';
		},
		initialData: dev ? mouseNpubKey : '',
		cacheTime: Infinity,
		staleTime: Infinity
	});

	query.subscribe((q) => {
		if (!browser) return;
		localStorage.setItem('pubkey', q.data || '');
	});

	return query;
};

export const useRelays = () => {
	const query = createQuery<z.infer<typeof relayScheme>>(['relays'], {
		queryFn: async () => {
			const pubkey = get(usePubkey());
			if (pubkey.data) {
				const event = await pool.get(
					Object.entries(defaultRelays).flatMap(([url, { read }]) => {
						return read ? url : [];
					}),
					{ kinds: [3], authors: [pubkey.data] }
				);
				if (event) {
					const parsed = relayScheme.safeParse(JSON.parse(event.content));
					return parsed.success ? parsed.data : {};
				}
			}
			return {};
		},
		initialData: defaultRelays
	});
	return query;
};

export type RelaysData = z.infer<typeof relayScheme>;
export const relays = writable<
	Record<
		string,
		{
			read: boolean;
			write: boolean;
		}
	>
>(defaultRelays);

const relayScheme = z.record(
	z.object({
		read: z.boolean(),
		write: z.boolean()
	})
);

// pubkey.subscribe(async (newKey) => {
// 	if (!browser) return;
// 	if (!newKey) return;
// 	localStorage.setItem('pubkey', newKey);
// 	const sub = subscribeEvents(3, { authors: [newKey] });
// 	sub.on('event', (event) => {
// 		const parsed = relayScheme.safeParse(JSON.parse(event.content));
// 		if (parsed.success) {
// 			relays.set(parsed.data);
// 		}
// 	});
// });
