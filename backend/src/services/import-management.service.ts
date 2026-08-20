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
}
