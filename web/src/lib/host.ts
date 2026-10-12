// Register synchronously, before asynchronous manifest/ABI loading. Some hosts
// send init only once, at iframe load. Preserve just that trusted parent message
// until the official SDK listener is ready; never infer hosted mode from a URL.
let buffered: { channel: string; preview: boolean; origin: string } | null =
  null;
function capture(event: MessageEvent) {
  const message = event.data;
  if (
    window.parent === window ||
    event.source !== window.parent ||
    message?.protocol !== "pepe-game/1" ||
    message.type !== "init" ||
    typeof message.channel !== "string"
  )
    return;
  buffered = {
    channel: message.channel,
    preview: message.preview === true,
    origin: event.origin,
  };
}
if (window.parent !== window) window.addEventListener("message", capture);
export function deliverBufferedHostInit() {
  window.removeEventListener("message", capture);
  if (!buffered) return;
  const init = buffered;
  buffered = null;
  window.dispatchEvent(
    new MessageEvent("message", {
      source: window.parent,
      origin: init.origin,
      data: {
        protocol: "pepe-game/1",
        type: "init",
        channel: init.channel,
        preview: init.preview,
      },
    }),
  );
}
