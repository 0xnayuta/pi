import type { AgentSessionEvent } from "../core/agent-session.ts";

export type JsonStreamProfile = "full" | "compact";

export function serializeJsonStreamEvent(
	event: AgentSessionEvent,
	profile: JsonStreamProfile,
): AgentSessionEvent | Record<string, unknown> | undefined {
	if (profile === "full") {
		return event;
	}
	return compactAgentSessionEvent(event);
}

function compactAgentSessionEvent(event: AgentSessionEvent): AgentSessionEvent | Record<string, unknown> | undefined {
	switch (event.type) {
		case "message_update": {
			return {
				type: "message_update",
				assistantMessageEvent: compactAssistantMessageEvent(
					(event as Record<string, unknown>).assistantMessageEvent,
				),
			};
		}
		case "tool_execution_update":
			return undefined;
		default:
			return event;
	}
}

function compactAssistantMessageEvent(value: unknown): unknown {
	if (!isRecord(value)) return value;

	return stripAssistantMessageEventNoise(value);
}

function stripAssistantMessageEventNoise(event: Record<string, unknown>): Record<string, unknown> {
	const cleaned = { ...event };
	delete cleaned.partial;
	delete cleaned.message;
	delete cleaned.provider;
	delete cleaned.model;
	delete cleaned.api;
	delete cleaned.timestamp;
	if (isZeroUsage(cleaned.usage)) {
		delete cleaned.usage;
	}
	return cleaned;
}

function isZeroUsage(value: unknown): boolean {
	if (!isRecord(value)) return false;
	const directKeys = ["input", "output", "cacheRead", "cacheWrite", "totalTokens"];
	for (const key of directKeys) {
		const current = value[key];
		if (typeof current === "number" && current !== 0) return false;
		if (current !== undefined && typeof current !== "number") return false;
	}

	if (value.cost !== undefined) {
		if (!isRecord(value.cost)) return false;
		for (const current of Object.values(value.cost)) {
			if (typeof current === "number" && current !== 0) return false;
			if (current !== undefined && typeof current !== "number") return false;
		}
	}

	return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
