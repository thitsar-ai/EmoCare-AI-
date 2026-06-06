/** Lets Settings delete-all-data reset Root React state without a full app restart. */
let resetHandler = null;

export function setAppResetHandler(handler) {
  resetHandler = handler;
}

export function triggerAppReset() {
  resetHandler?.();
}
