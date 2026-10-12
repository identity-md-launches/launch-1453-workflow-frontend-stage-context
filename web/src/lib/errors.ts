export function friendlyError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  if (/reject|denied|cancel|4001/i.test(text))
    return "Request cancelled. Nothing was sent. You can try again when you’re ready.";
  if (
    /4902|unknown.chain|wrong.chain|switch.*chain|network.mismatch/i.test(text)
  )
    return "Switch to Ethereum in Pepe2Pepe, then try again. The host will offer to add the network if needed.";
  if (/wallet|account|player/i.test(text))
    return "Use the wallet that started this run in Pepe2Pepe, then try again.";
  if (/fund|reserve|balance|empty|budget/i.test(text))
    return "Rewards are temporarily unavailable. The reward pool needs funding or its run limit has been reached. Try again later.";
  if (/expired|deadline|session_expired/i.test(text))
    return "This run’s reward window has expired. Your score is kept. Start another run.";
  if (/limit|rate|queue.full|too.many/i.test(text))
    return "The service is busy or your run limit is reached. Wait a little, then try again.";
  if (/claimed|duplicate/i.test(text))
    return "This reward may already be claimed. Check My reward in Pepe2Pepe before trying again.";
  if (/timeout|timed out|pending|receipt/i.test(text))
    return "Confirmation is taking longer than expected. Check My reward and your wallet in Pepe2Pepe before retrying.";
  if (/signature|invalid.reward|rules|release|tamper/i.test(text))
    return "This reward could not be verified. Keep this result and check My reward in Pepe2Pepe.";
  if (/host|channel/i.test(text))
    return "The host connection changed. Reopen this game from Pepe2Pepe to recover your run.";
  return "The service could not complete that request. Your result is kept. Check your connection, then retry.";
}
