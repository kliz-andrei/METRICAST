import { describe, expect, it, vi } from "vitest";

const { queryRaw } = vi.hoisted(() => ({
  queryRaw: vi.fn().mockResolvedValue([]),
}));

vi.mock("../database/client.js", () => ({
  prisma: { $queryRaw: queryRaw },
}));

import { OperationalRepository } from "./operational.repository.js";

describe("OperationalRepository timezone aggregation", () => {
  it("groups operational hours and dates in Asia/Manila", async () => {
    const repository = new OperationalRepository();

    await repository.hourlyOperations({});
    await repository.dailyOperations({});

    const hourlySql = queryRaw.mock.calls[0][0].join(" ");
    const dailySql = queryRaw.mock.calls[1][0].join(" ");

    expect(hourlySql).toContain('"occurredAt" AT TIME ZONE \'Asia/Manila\'');
    expect(dailySql).toContain('"occurredAt" AT TIME ZONE \'Asia/Manila\'');
  });
});
