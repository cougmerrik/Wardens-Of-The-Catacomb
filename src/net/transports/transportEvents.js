export function createTransportEventTarget() {
  const handlers = new Map();
  return {
    on(type, fn) {
      if (!handlers.has(type)) handlers.set(type, []);
      handlers.get(type).push(fn);
    },
    emit(type, payload = {}) {
      const list = handlers.get(type) || [];
      for (const fn of list) fn(payload);
    }
  };
}
