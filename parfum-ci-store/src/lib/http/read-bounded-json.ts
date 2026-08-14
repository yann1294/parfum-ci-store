import "server-only";

export type BoundedJsonErrorCode = "UNSUPPORTED_MEDIA_TYPE" | "PAYLOAD_TOO_LARGE" | "INVALID_JSON";

export class BoundedJsonError extends Error {
  constructor(readonly code: BoundedJsonErrorCode) {
    super(code);
    this.name = "BoundedJsonError";
  }
}

function isJsonContentType(value: string | null) {
  const mediaType = value?.split(";", 1)[0]?.trim().toLowerCase();
  return mediaType === "application/json" || Boolean(mediaType?.endsWith("+json"));
}

export async function readBoundedJson(request: Request, maxBytes: number): Promise<unknown> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error("INVALID_BODY_LIMIT");
  }

  if (!isJsonContentType(request.headers.get("content-type"))) {
    throw new BoundedJsonError("UNSUPPORTED_MEDIA_TYPE");
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0) {
      throw new BoundedJsonError("INVALID_JSON");
    }
    if (parsedLength > maxBytes) throw new BoundedJsonError("PAYLOAD_TOO_LARGE");
  }

  if (!request.body) throw new BoundedJsonError("INVALID_JSON");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new BoundedJsonError("PAYLOAD_TOO_LARGE");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof BoundedJsonError) throw error;
    throw new BoundedJsonError("INVALID_JSON");
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return JSON.parse(text) as unknown;
  } catch {
    throw new BoundedJsonError("INVALID_JSON");
  }
}
