
import { describe, expect, it, vi } from "vitest";
import { ticketsRouter } from "./routers/tickets";
import type { TrpcContext } from "./_core/context";

// Mock the database dependency
vi.mock("./db", () => ({
  getAllTickets: vi.fn(),
  getProfileByUserId: vi.fn(),
  getOpenTicketsCount: vi.fn(),
}));

import * as db from "./db";

function createMockContext(role: "atendente" | "gerente" | "admin" = "atendente"): TrpcContext {
  return {
    user: {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      role: role,
      openId: "test-openid",
      loginMethod: "manus",
      departmentId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    profileRole: role,
    req: {} as any,
    res: {} as any,
  } as TrpcContext;
}

describe("tickets router", () => {
  it("should list tickets filtering by assignedTo for atendente", async () => {
    const ctx = createMockContext("atendente");
    const caller = ticketsRouter.createCaller(ctx);

    const mockTickets = [{ id: 1, title: "Test Ticket", assignedTo: 1 }];
    vi.mocked(db.getAllTickets).mockResolvedValue(mockTickets as any);

    const result = await caller.list({});

    expect(db.getAllTickets).toHaveBeenCalledWith(
      expect.objectContaining({
        assignedTo: 1
      })
    );
    expect(result).toEqual(mockTickets);
  });

  it("should list tickets filtering by departmentId for gerente", async () => {
    const ctx = createMockContext("gerente");
    const caller = ticketsRouter.createCaller(ctx);

    vi.mocked(db.getProfileByUserId).mockResolvedValue({ departmentId: 2 } as any);
    const mockTickets = [{ id: 2, title: " Dept Ticket", departmentId: 2 }];
    vi.mocked(db.getAllTickets).mockResolvedValue(mockTickets as any);

    await caller.list({});

    expect(db.getAllTickets).toHaveBeenCalledWith(
      expect.objectContaining({
        departmentId: 2
      })
    );
  });
});



