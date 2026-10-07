/**
 * Unit tests for the OpenRouter chat service — always injected, never network.
 * Run: pnpm --filter @lantern/api test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AgentProfile } from "@lantern/types";
import {
  ChatConfigError,
  createOpenRouterChatService,
  buildSystemPrompt,
  type ChatFetcher,
} from "./openRouterChat.js";

const PROFILE: AgentProfile = {
  agentId: 7,
  name: "Mock Yield Keeper",
  passportTokenId: 1,
  owner: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  risk: "LOW",
  executions: 128,
  failures: 4,
  updatedAt: 1_790_856_000,
  identityUri: "ipfs://mock-agent-7",
  passportUri: "ipfs://mock-passport-7",
  attestations: [],
  bio: "Steady yield keeper.",
};

interface CapturedCall {
  url: string;
  init?: Parameters<ChatFetcher>[1];
}

function fakeFetcher(
  reply: unknown,
  opts: { ok?: boolean; status?: number } = {},
): { fetcher: ChatFetcher; calls: CapturedCall[] } {
  const calls: CapturedCall[] = [];
  const fetcher: ChatFetcher = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: opts.ok ?? true,
      status: opts.status ?? 200,
      json: async () => reply,
    };
  };
  return { fetcher, calls };
}

describe("buildSystemPrompt", () => {
  it("binds the persona to the on-record profile", () => {
    const prompt = buildSystemPrompt(PROFILE);
    assert.match(prompt, /#7/);
    assert.match(prompt, /Mock Yield Keeper/);
    assert.match(prompt, /128 executions/);
    assert.match(prompt, /risk LOW/);
    assert.match(prompt, /Steady yield keeper\./);
    assert.match(prompt, /mock profile data/);
    assert.match(prompt, /never invent/i);
  });

  it("falls back to a generic persona without a bio", () => {
    const prompt = buildSystemPrompt({ ...PROFILE, bio: undefined });
    assert.match(prompt, /demo agent persona/);
  });
});

describe("createOpenRouterChatService", () => {
  it("posts to /chat/completions with bearer auth, model and bounded history", async () => {
    const { fetcher, calls } = fakeFetcher({
      choices: [{ message: { content: "all green on my end" } }],
    });
    const service = createOpenRouterChatService({
      apiKey: "test-key",
      model: "openrouter/free",
      baseUrl: "https://openrouter.ai/api/v1",
      fetcher,
    });

    const history = Array.from({ length: 15 }, (_, i) => ({
      role: i % 2 ? ("assistant" as const) : ("user" as const),
      content: `turn ${i}`,
    }));

    const reply = await service.complete(PROFILE, "status?", history);

    assert.equal(reply, "all green on my end");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://openrouter.ai/api/v1/chat/completions");
    assert.equal(calls[0].init?.method, "POST");
    assert.equal(calls[0].init?.headers?.Authorization, "Bearer test-key");
    assert.ok(calls[0].init?.signal instanceof AbortSignal);

    const body = JSON.parse(calls[0].init?.body ?? "{}") as {
      model: string;
      messages: { role: string; content: string }[];
    };
    assert.equal(body.model, "openrouter/free");
    // system + last 10 history turns + user message
    assert.equal(body.messages.length, 12);
    assert.equal(body.messages[0].role, "system");
    assert.match(body.messages[0].content, /#7/);
    assert.deepEqual(
      body.messages.slice(1, 11).map((m) => m.content),
      history.slice(-10).map((m) => m.content),
    );
    assert.deepEqual(body.messages.at(-1), { role: "user", content: "status?" });
  });

  it("defaults to the free-tier router when CHAT_MODEL is unset", async () => {
    const { fetcher, calls } = fakeFetcher({ choices: [{ message: { content: "hi" } }] });
    const service = createOpenRouterChatService({ apiKey: "k", fetcher });

    const previous = process.env.CHAT_MODEL;
    delete process.env.CHAT_MODEL;
    try {
      await service.complete(PROFILE, "yo", []);
    } finally {
      if (previous === undefined) delete process.env.CHAT_MODEL;
      else process.env.CHAT_MODEL = previous;
    }

    const body = JSON.parse(calls[0].init?.body ?? "{}") as { model: string };
    assert.equal(body.model, "openrouter/free");
  });

  it("throws ChatConfigError when the API key is missing", async () => {
    const service = createOpenRouterChatService({ apiKey: "", fetcher: fakeFetcher({}).fetcher });
    await assert.rejects(
      service.complete(PROFILE, "hi", []),
      (err: unknown) => err instanceof ChatConfigError,
    );
  });

  it("retries once when the first response carries no content", async () => {
    let calls = 0;
    const flakyFetcher: ChatFetcher = async () => {
      calls += 1;
      return {
        ok: true,
        status: 200,
        json: async () =>
          calls === 1 ? { choices: [] } : { choices: [{ message: { content: "second try" } }] },
      };
    };
    const service = createOpenRouterChatService({ apiKey: "k", fetcher: flakyFetcher });

    const reply = await service.complete(PROFILE, "hi", []);
    assert.equal(reply, "second try");
    assert.equal(calls, 2);
  });

  it("throws on non-2xx provider responses", async () => {
    const { fetcher } = fakeFetcher({}, { ok: false, status: 429 });
    const service = createOpenRouterChatService({ apiKey: "k", fetcher });
    await assert.rejects(service.complete(PROFILE, "hi", []), /HTTP 429/);
  });

  it("throws when the payload has no content", async () => {
    const { fetcher } = fakeFetcher({ choices: [] });
    const service = createOpenRouterChatService({ apiKey: "k", fetcher });
    await assert.rejects(service.complete(PROFILE, "hi", []), /missing content/);
  });

  it("throws a clean error when the provider is unreachable", async () => {
    const fetcher: ChatFetcher = async () => {
      throw new Error("network down");
    };
    const service = createOpenRouterChatService({ apiKey: "k", fetcher });
    await assert.rejects(service.complete(PROFILE, "hi", []), /OpenRouter unreachable: network down/);
  });
});
