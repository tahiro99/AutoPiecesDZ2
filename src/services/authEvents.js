const listeners = new Set();

export const onAuthChange = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const emitAuthChange = (user) => {
  listeners.forEach((fn) => { try { fn(user); } catch (e) {} });
};