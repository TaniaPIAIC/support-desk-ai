import { desc, eq, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertTicket, InsertTicketMessage, tickets, ticketMessages, InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb(); if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listTickets(userId: number, isAdmin = false) {
  const db = await getDb(); if (!db) return [];
  const where = isAdmin ? undefined : or(eq(tickets.customerId, userId), eq(tickets.assigneeId, userId));
  const rows = await db.select().from(tickets).where(where).orderBy(desc(tickets.updatedAt));
  if (rows.length === 0) {
    const seed = [
      { ticketNumber: `SD-${userId}01`, customerId: userId, assigneeId: userId, subject: "Duplicate charge on my last invoice", description: "I was charged twice for my Pro plan renewal this morning.", status: "new" as const, priority: "urgent" as const, category: "Billing", aiSummary: "Customer reports a duplicate Pro plan renewal charge.", aiSuggestedRoute: "Billing · Payments", aiConfidence: 96 },
      { ticketNumber: `SD-${userId}02`, customerId: userId, assigneeId: userId, subject: "Export keeps timing out", description: "CSV export fails for workspaces with more than 10k records.", status: "in_progress" as const, priority: "high" as const, category: "Technical", aiSummary: "CSV export times out for larger workspaces.", aiSuggestedRoute: "Technical · Data exports", aiConfidence: 91 },
      { ticketNumber: `SD-${userId}03`, customerId: userId, assigneeId: userId, subject: "How do I add a teammate?", description: "I need to invite a new designer to our workspace.", status: "waiting_on_customer" as const, priority: "medium" as const, category: "Account", aiSummary: "Customer needs help inviting a teammate.", aiSuggestedRoute: "Account · Permissions", aiConfidence: 98 },
    ];
    for (const item of seed) await db.insert(tickets).values(item).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
    return db.select().from(tickets).where(where).orderBy(desc(tickets.updatedAt));
  }
  return rows;
}

export async function getTicketForUser(ticketId: number, userId: number, isAdmin = false) {
  const record = await getTicket(ticketId);
  if (!record?.ticket) return undefined;
  if (!isAdmin && record.ticket.customerId !== userId && record.ticket.assigneeId !== userId) return undefined;
  return record;
}

export async function getTicket(ticketId: number) {
  const db = await getDb(); if (!db) return undefined;
  const ticket = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
  const messages = await db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, ticketId)).orderBy(ticketMessages.createdAt);
  return { ticket: ticket[0], messages };
}

export async function createTicket(input: InsertTicket) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.insert(tickets).values(input);
  const row = await db.select().from(tickets).where(eq(tickets.ticketNumber, input.ticketNumber)).limit(1);
  return row[0];
}

export async function addTicketMessage(input: InsertTicketMessage) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.insert(ticketMessages).values(input);
  return getTicket(input.ticketId);
}

export async function updateTicket(ticketId: number, patch: Partial<Pick<InsertTicket, "status" | "priority" | "assigneeId" | "category" | "aiSummary" | "aiSuggestedRoute" | "aiConfidence">>) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.update(tickets).set(patch).where(eq(tickets.id, ticketId));
  const row = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
  return row[0];
}
