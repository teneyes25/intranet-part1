export const MESSENGER_POPUP_PATH = "/messenger/pop";
export const MESSENGER_POPUP_NAME = "intranet-messenger";
export const MESSENGER_POPUP_FEATURES =
  "width=460,height=700,left=80,top=80,resizable=yes,scrollbars=yes,menubar=no,toolbar=no,location=no,status=no";

/** 카카오톡·네이트온처럼 작은 독립 창. 이미 열려 있으면 그 창을 앞으로. */
export function openMessengerPopup(): Window | null {
  if (typeof window === "undefined") return null;
  const w = window.open(
    MESSENGER_POPUP_PATH,
    MESSENGER_POPUP_NAME,
    MESSENGER_POPUP_FEATURES,
  );
  if (w) {
    try {
      w.focus();
    } catch {
      /* ignore */
    }
    return w;
  }
  window.location.href = MESSENGER_POPUP_PATH;
  return null;
}
