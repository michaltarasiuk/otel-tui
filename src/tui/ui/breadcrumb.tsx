import { THEME } from "../theme.ts";

interface BreadcrumbProps {
  items: string[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <text flexShrink={0} wrapMode="none" truncate>
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <span key={index} fg={last ? THEME.text : THEME.textMuted}>
            {index > 0 ? " › " : null}
            {last ? <b>{item}</b> : item}
          </span>
        );
      })}
    </text>
  );
}
