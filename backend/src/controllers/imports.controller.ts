import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RequestHandler } from "express";
import { prisma } from "../database/client.js";
import { PosImportService } from "../database/pos-import.service.js";
import { AppError } from "../lib/errors.js";
import { ImportManagementService } from "../services/import-management.service.js";

const management = new ImportManagementService();
const required = ["transactions", "productSales", "payments"] as const;

export const listImports: RequestHandler = async (_request, response) => {
  response.json({ data: await management.list() });
};

export const getImport: RequestHandler = async (request, response) => {
  const entry = await management.find(request.params.id as string);
  if (!entry)
    throw new AppError(404, "Import history record not found.", "NOT_FOUND");
  response.json({ data: entry });
};

export const importOverview: RequestHandler = async (_request, response) => {
  response.json({ data: await management.overview() });
};

export const uploadPos: RequestHandler = async (request, response) => {
  let directory: string | undefined;

  try {
    const files = request.files as
      Record<string, Express.Multer.File[]> | undefined;
    if (!files || required.some((key) => !files[key]?.[0])) {
      throw new AppError(
        422,
        "Upload Transactions.csv, ProductSales.csv, and Payments.csv.",
        "MISSING_FILES",
      );
    }

    const values = Object.fromEntries(
      required.map((key) => [key, files[key][0]]),
    ) as Record<(typeof required)[number], Express.Multer.File>;
    for (const key of required) {
      if (!values[key].originalname.toLowerCase().endsWith(".csv")) {
        throw new AppError(
          422,
          `${key} must be a CSV file.`,
          "INVALID_FILE_TYPE",
        );
      }
    }

    directory = join(tmpdir(), "metricast-imports", randomUUID());
    await mkdir(directory, { recursive: true });
    const paths = {
      transactions: join(directory, "Transactions.csv"),
      productSales: join(directory, "ProductSales.csv"),
      payments: join(directory, "Payments.csv"),
    };
    await Promise.all(
      required.map((key) => writeFile(paths[key], values[key].buffer)),
    );

    const result = await new PosImportService(prisma).import(paths);
    await prisma.importBatch.update({
      where: { id: result.batchId },
      data: { createdById: request.auth!.userId },
    });

    response.status(201).json({
      data: {
        ...result,
        totalRows:
          result.importedTransactions +
          result.importedItems +
          result.importedPayments +
          result.skippedTransactions,
        failedRows: 0,
      },
    });
  } catch (error) {
    console.error("IMPORT ERROR");
    console.error(error);
    if (error instanceof Error) {
      console.error("message:", error.message);
      console.error("stack:", error.stack);
      console.error("cause:", error.cause);

      if (error.message.startsWith("This POS export was already imported")) {
        throw new AppError(409, error.message, "DUPLICATE_IMPORT");
      }
      if (error.message.startsWith("POS import rejected:")) {
        throw new AppError(422, error.message, "POS_VALIDATION_FAILED");
      }
    }
    throw error;
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
  }
};
