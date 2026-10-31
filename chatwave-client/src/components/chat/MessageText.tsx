import { Fragment } from "react";

// http(s) links, without trailing punctuation that usually ends the sentence.
const LINK = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g;

/** Message text with links made clickable. React escapes everything else. */
export function MessageText({ text }: { text: string }) {
  const parts = text.split(LINK);

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all underline decoration-current/40 underline-offset-2 hover:decoration-current"
      >
        {part}
      </a>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}
