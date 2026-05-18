import { describe, expect, it } from "vitest";
import { serializeJsonStreamEvent } from "../src/modes/json-event-filter.js";

describe("serializeJsonStreamEvent", () => {
	it("returns event unchanged in full profile", () => {
		const event = {
			type: "message_update",
			message: { role: "assistant", content: [{ type: "text", text: "partial" }] },
			assistantMessageEvent: { type: "text_delta", contentIndex: 0, delta: "x", partial: { role: "assistant" } },
		};
		expect(serializeJsonStreamEvent(event as never, "full")).toBe(event);
	});

	it("compacts message_update in compact profile", () => {
		const event = {
			type: "message_update",
			message: { role: "assistant", content: [{ type: "text", text: "partial" }] },
			assistantMessageEvent: {
				type: "text_delta",
				contentIndex: 0,
				delta: "x",
				finishReason: "streaming",
				partial: { role: "assistant", content: [{ type: "text", text: "partial" }] },
				provider: "anthropic",
				model: "claude",
				timestamp: 123,
			},
		};

		expect(serializeJsonStreamEvent(event as never, "compact")).toEqual({
			type: "message_update",
			assistantMessageEvent: {
				type: "text_delta",
				contentIndex: 0,
				delta: "x",
				finishReason: "streaming",
			},
		});
	});

	it("drops tool_execution_update in compact profile", () => {
		const event = { type: "tool_execution_update", toolCallId: "1", partialResult: "huge" };
		expect(serializeJsonStreamEvent(event as never, "compact")).toBeUndefined();
	});

	it("preserves non-snapshot delta metadata and non-zero usage cost", () => {
		const event = {
			type: "message_update",
			message: { role: "assistant", content: [{ type: "tool-call", id: "call_1" }] },
			assistantMessageEvent: {
				type: "toolcall_delta",
				contentIndex: 1,
				delta: "{\"x\"",
				toolCallId: "call_1",
				partial: { role: "assistant", content: [{ type: "tool-call", id: "call_1" }] },
				usage: {
					input: 0,
					output: 0,
					cacheRead: 0,
					cacheWrite: 0,
					totalTokens: 0,
					cost: { input: 0, output: 0.01, cacheRead: 0, cacheWrite: 0, total: 0.01 },
				},
			},
		};

		expect(serializeJsonStreamEvent(event as never, "compact")).toEqual({
			type: "message_update",
			assistantMessageEvent: {
				type: "toolcall_delta",
				contentIndex: 1,
				delta: "{\"x\"",
				toolCallId: "call_1",
				usage: {
					input: 0,
					output: 0,
					cacheRead: 0,
					cacheWrite: 0,
					totalTokens: 0,
					cost: { input: 0, output: 0.01, cacheRead: 0, cacheWrite: 0, total: 0.01 },
				},
			},
		});
	});
});
