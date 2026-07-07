export const primaryStickyMemoStorageKey = "asc-primary-sticky-memo-id";
export const primaryStickyMemoChangedEvent = "asc-primary-sticky-memo-changed";

export function readPrimaryStickyMemoId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(primaryStickyMemoStorageKey) ?? "";
}

export function writePrimaryStickyMemoId(id: string) {
  if (typeof window === "undefined") return;

  if (id) {
    window.localStorage.setItem(primaryStickyMemoStorageKey, id);
  } else {
    window.localStorage.removeItem(primaryStickyMemoStorageKey);
  }

  window.dispatchEvent(new CustomEvent(primaryStickyMemoChangedEvent, { detail: { id } }));
}
