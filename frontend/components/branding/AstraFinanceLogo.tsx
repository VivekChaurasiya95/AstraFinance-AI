import type { ImgHTMLAttributes } from "react";

const LOGO_SRC = "/logo.svg";

type AstraFinanceLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">;

/** Renders the unmodified, official AstraFinance PNG from the canonical asset path. */
export function AstraFinanceLogo({ className, ...props }: AstraFinanceLogoProps) {
  return (
    <img
      src={LOGO_SRC}
      alt="AstraFinance"
      draggable={false}
      className={`object-contain [image-rendering:auto] ${className ?? ""}`}
      {...props}
    />
  );
}
