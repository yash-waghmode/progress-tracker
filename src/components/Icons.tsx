interface IconProps {
  size?: number;
}

export function PlusIcon({ size = 18 }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function TrashIcon({ size = 17 }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size}>
      <path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14M10 11v6M14 11v6" />
    </svg>
  );
}

export function CheckIcon({ size = 14 }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width={size} height={size}>
      <path d="m3 8 3.1 3L13 4.5" />
    </svg>
  );
}

export function ArrowIcon({ size = 18 }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size}>
      <path d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  );
}

export function ChevronIcon({ size = 18 }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size}>
      <path d="m7 9.5 5 5 5-5" />
    </svg>
  );
}
