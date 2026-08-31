export function createId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const values = crypto.getRandomValues(new Uint32Array(4));
  return [...values].map((value) => value.toString(36)).join("-");
}
