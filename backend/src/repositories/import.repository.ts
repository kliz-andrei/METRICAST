import { prisma } from "../database/client.js";

export class ImportRepository {
  list() {
    return prisma.importBatch.findMany({
      orderBy: {
        startedAt: "desc",
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        errors: {
          take: 20,
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  }

  find(id: string) {
    return prisma.importBatch.findUnique({
      where: {
        id,
      },
      include: {
        errors: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  }
}