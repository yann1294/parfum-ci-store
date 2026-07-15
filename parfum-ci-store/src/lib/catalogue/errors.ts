export class CatalogueError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CatalogueError";
  }
}

export function isCatalogueError(error: unknown): error is CatalogueError {
  return error instanceof CatalogueError;
}
