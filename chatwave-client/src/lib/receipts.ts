import type { Message, MessageStatus, Receipts } from "../types/message";

/**
 * The status of your own message: "seen" once the other person has read up to it,
 * "delivered" once their app has fetched it, otherwise "sent". Uses the newest receipts
 * when there are some, so older messages update too. Null for other people's messages,
 * and wherever status isn't shown (group chats, or roles without it).
 */
export function statusOf(message: Message, receipts: Receipts | null | undefined, meId: number | undefined): MessageStatus | null {
  if (message.sender.id !== meId) return null;
  if (receipts === undefined) return message.status ?? null;
  if (receipts === null) return null;
  if (receipts.read_up_to !== null && message.id <= receipts.read_up_to) return "seen";
  if (receipts.delivered_up_to !== null && message.id <= receipts.delivered_up_to) return "delivered";
  return "sent";
}

export function sameReceipts(a: Receipts | null | undefined, b: Receipts | null | undefined): boolean {
  return a?.delivered_up_to === b?.delivered_up_to && a?.read_up_to === b?.read_up_to && (a === null) === (b === null);
}
