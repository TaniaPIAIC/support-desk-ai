import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("tickets.list", () => {
  it("returns a collection for an authenticated support user", async () => {
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "ticket-test-user",
        email: "agent@example.com",
        name: "Ticket Test Agent",
        loginMethod: "test",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const result = await appRouter.createCaller(ctx).tickets.list();
    expect(Array.isArray(result)).toBe(true);
  });
});
