import { AppError } from "../lib/errors.js";
import { ImportRepository } from "../repositories/import.repository.js";

export class ImportManagementService {
  constructor(private readonly repository = new ImportRepository()) {}

  list() {
    return this.repository.list();
  }

  find(id: string) {
    return this.repository.find(id);
  }

  overview() {
    return this.repository.overview();
  }

  async deletionImpact(id: string) {
    const impact = await this.repository.deletionImpact(id);
    if (!impact)
      throw new AppError(404, "Import history record not found.", "NOT_FOUND");
    return impact;
  }

  async deleteBatch(id: string, actorId: string, confirmation: string) {
    const impact = await this.repository.deletionImpact(id);
    if (!impact) {
      await this.repository.recordFailedDeletion(
        actorId,
        id,
        "Import batch does not exist.",
      );
      throw new AppError(404, "This import no longer exists.", "NOT_FOUND");
    }
    if (confirmation !== id) {
      await this.repository.recordFailedDeletion(
        actorId,
        id,
        "Confirmation did not match the import batch ID.",
      );
      throw new AppError(
        422,
        "Confirmation does not match this import batch.",
        "INVALID_CONFIRMATION",
      );
    }
    if (!impact.safety.canDelete) {
      await this.repository.recordFailedDeletion(
        actorId,
        id,
        impact.safety.reason ?? "Deletion safety checks failed.",
      );
      throw new AppError(
        409,
        impact.safety.reason ?? "This import cannot be safely removed.",
        "UNSAFE_IMPORT_DELETION",
      );
    }

    try {
      return await this.repository.deleteCompletedBatch(
        id,
        actorId,
        confirmation,
      );
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Unexpected deletion failure.";
      await this.repository.recordFailedDeletion(actorId, id, reason);
      if (reason === "IMPORT_NOT_FOUND")
        throw new AppError(404, "This import no longer exists.", "NOT_FOUND");
      if (reason === "INVALID_CONFIRMATION")
        throw new AppError(
          422,
          "Confirmation does not match this import batch.",
          "INVALID_CONFIRMATION",
        );
      if (reason === "UNSAFE_IMPORT_DELETION")
        throw new AppError(
          409,
          "This import cannot be safely removed because related records do not have complete batch provenance.",
          "UNSAFE_IMPORT_DELETION",
        );
      console.error("IMPORT DELETION ERROR", error);
      throw new AppError(
        500,
        "Unable to delete this import safely. No data was removed.",
        "IMPORT_DELETION_FAILED",
      );
    }
  }
}
