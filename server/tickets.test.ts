import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter, runTriage } from "./routers";
import type { TrpcContext } from "./_core/context";
import { invokeLLM } from "./_core/llm";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
  listLLMModels: vi.fn(),
}));

function context(id = 1, role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: { id, openId: `ticket-test-user-${id}`, email: `agent${id}@example.com`, name: `Ticket Test Agent ${id}`, loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("ticket procedures", () => {
  beforeEach(() => {
    vi.mocked(invokeLLM).mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ category: "Billing", urgency: "high", summary: "Duplicate charge needs review.", route: "Billing · Payments", confidence: 93 }) } }] } as never);
  });

  it("returns a collection for an authenticated support user", async () => {
    const result = await appRouter.createCaller(context()).tickets.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates, replies to, and updates a ticket", async () => {
    const caller = appRouter.createCaller(context(41));
    const created = await caller.tickets.create({ subject: "Test billing request", description: "Please review this billing issue for the test workspace.", priority: "medium" });
    expect(created.category).toBe("Billing");
    expect(created.aiConfidence).toBe(93);
    const replied = await caller.tickets.reply({ ticketId: created.id, body: "We are reviewing this now." });
    expect(replied?.messages.some(message => message.body === "We are reviewing this now.")).toBe(true);
    const updated = await caller.tickets.update({ id: created.id, status: "resolved", assigneeId: 41 });
    expect(updated?.status).toBe("resolved");
  });

  it("does not reveal a missing or inaccessible ticket", async () => {
    const caller = appRouter.createCaller(context(42));
    await expect(caller.tickets.get({ id: 999999999 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const other = await appRouter.createCaller(context(43)).tickets.create({ subject: "Private test request", description: "This ticket belongs to another test account.", priority: "low" });
    await expect(caller.tickets.get({ id: other.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("falls back to safe general triage when the model fails", async () => {
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("model unavailable"));
    const result = await runTriage("Something is wrong", "The customer needs a safe fallback response while the model is unavailable.");
    expect(result).toEqual({ category: "General", urgency: "medium", summary: "The customer needs a safe fallback response while the model is unavailable.", route: "Support · General", confidence: 55 });
  });
});
