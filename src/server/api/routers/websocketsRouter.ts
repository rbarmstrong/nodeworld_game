import { initTRPC } from '@trpc/server';
import { observable } from '@trpc/server/observable';
import { EventEmitter } from 'events';
import { z } from 'zod';

// create a global event emitter (could be replaced by redis, etc)
const ee = new EventEmitter();

const t = initTRPC.create();

export type ChatMessage = {
	id?: string | undefined;
	text: string;
};

const WS_EVENTS = {
	Message: 'message',
} as const;

export const baseWebsocketsRouter = t.router({
	onMessage: t.procedure.subscription(() => {
		// return an `observable` with a callback which is triggered immediately
		return observable<ChatMessage>((emit) => {
			const onMessage = (data: ChatMessage) => {
				// emit data to client
				emit.next(data);
			};

			// trigger `onAdd()` when `add` is triggered in our event emitter
			ee.on(WS_EVENTS.Message, onMessage);

			// unsubscribe function when client disconnects or stops subscribing
			return () => {
				ee.off(WS_EVENTS.Message, onMessage);
			};
		});
	}),
	message: t.procedure
		.input(
			z.object({
				id: z.string().uuid().optional(),
				text: z.string().min(1),
			}),
		)
		.mutation(async (opts) => {
			const post = { ...opts.input }; /* [..] add to db */

			ee.emit(WS_EVENTS.Message, post);
			return post;
		}),
});
