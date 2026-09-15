/** Share only pending work. Settled results (including failures) are never cached. */
export function createSingleFlight<T>() {
  const pending = new Map<string, Promise<T>>();

  return (key: string, run: () => Promise<T>): Promise<T> => {
    const existing = pending.get(key);
    if (existing) return existing;

    const operation = Promise.resolve().then(run).finally(() => {
      pending.delete(key);
    });
    pending.set(key, operation);
    return operation;
  };
}
