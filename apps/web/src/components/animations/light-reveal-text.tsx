export interface LightRevealTextProps {
  readonly text: string;
  readonly as?: "h1" | "h2" | "p";
  readonly className?: string;
}

export function LightRevealText({
  text,
  as: Tag = "h2",
  className = "",
}: Readonly<LightRevealTextProps>) {
  return (
    <Tag className={`light-words ${className}`} data-light-text>
      <span className="light-words-shadow">{text}</span>
      <span className="light-words-lit" aria-hidden="true">
        {text}
      </span>
    </Tag>
  );
}
