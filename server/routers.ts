import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { addTicketMessage, createTicket, getTicketForUser, listTickets, updateTicket } from "./db";

const triageSchema = { type: "object", properties: { category: { type: "string" }, urgency: { type: "string", enum: ["low", "medium", "high", "urgent"] }, summary: { type: "string" }, route: { type: "string" }, confidence: { type: "integer" } }, required: ["category", "urgency", "summary", "route", "confidence"], additionalProperties: false } as const;

export async function runTriage(subject: string, description: string) {
  try {
    const response = await invokeLLM({ model: "gpt-5-mini", messages: [{ role: "system", content: "You triage customer support tickets. Return only structured JSON. Be concise, practical, and conservative with urgency." }, { role: "user", content: `Subject: ${subject}\nDescription: ${description}` }], response_format: { type: "json_schema", json_schema: { name: "ticket_triage", strict: true, schema: triageSchema } } });
    return JSON.parse(String(response.choices[0]?.message?.content ?? "{}"));
  } catch (error) {
    console.warn("[AI triage] Falling back to general routing", error);
    return { category: "General", urgency: "medium", summary: description.slice(0, 160), route: "Support · General", confidence: 55 };
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  tickets: router({
    list: protectedProcedure.query(({ ctx }) => listTickets(ctx.user.id, ctx.user.role === "admin")),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => { const record = await getTicketForUser(input.id, ctx.user.id, ctx.user.role === "admin"); if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" }); return record; }),
    create: protectedProcedure.input(z.object({ subject: z.string().min(3), description: z.string().min(10), priority: z.enum(["low", "medium", "high", "urgent"]).default("medium") })).mutation(async ({ ctx, input }) => { const triage = await runTriage(input.subject, input.description); return createTicket({ ticketNumber: `SD-${String(Date.now()).slice(-6)}`, customerId: ctx.user.id, subject: input.subject, description: input.description, priority: triage.urgency ?? input.priority, status: "new", category: triage.category, aiSummary: triage.summary, aiSuggestedRoute: triage.route, aiConfidence: triage.confidence }); }),
    reply: protectedProcedure.input(z.object({ ticketId: z.number(), body: z.string().min(1) })).mutation(async ({ ctx, input }) => { const record = await getTicketForUser(input.ticketId, ctx.user.id, ctx.user.role === "admin"); if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" }); return addTicketMessage({ ticketId: input.ticketId, authorId: ctx.user.id, body: input.body }); }),
    update: protectedProcedure.input(z.object({ id: z.number(), status: z.enum(["new", "in_progress", "waiting_on_customer", "resolved"]).optional(), priority: z.enum(["low", "medium", "high", "urgent"]).optional(), assigneeId: z.number().nullable().optional(), category: z.string().optional() })).mutation(async ({ ctx, input }) => { const record = await getTicketForUser(input.id, ctx.user.id, ctx.user.role === "admin"); if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" }); const { id, ...patch } = input; return updateTicket(id, patch); }),
    triage: protectedProcedure.input(z.object({ subject: z.string(), description: z.string() })).mutation(({ input }) => runTriage(input.subject, input.description)),
  }),
});

export type AppRouter = typeof appRouter;
