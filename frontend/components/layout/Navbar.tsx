import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Navbar() {
  return (
    <header className="w-full absolute top-0 left-0 right-0 z-50 px-6 md:px-12 lg:px-24 h-20 flex items-center justify-between mx-auto bg-background/80 backdrop-blur-[16px] border-b border-border transition-theme">
      <div className="flex items-center gap-4">
        <Link href="/">
          <img
            src="/logo.svg"
            alt="AstraFinance AI Logo"
            className="h-12 md:h-16 w-auto object-contain transition-theme"
          />
        </Link>
      </div>
      <div className="flex items-center gap-4 md:gap-6">
        <ThemeToggle />
        <Link
          href="/login"
          className="text-sm md:text-base font-medium text-foreground hover:text-primary transition-colors"
        >
          Login
        </Link>
        <Link href="/register">
          <Button className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-4 md:px-6 py-2 rounded-md transition-all border-none shadow-[0_6px_24px_rgba(67,198,188,0.14)] hover:-translate-y-[1px] text-sm md:text-base">
            Get Started
          </Button>
        </Link>
      </div>
    </header>
  );
}
