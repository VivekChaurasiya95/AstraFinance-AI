import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-surface-container-highest py-xl px-gutter mt-auto border-t border-outline-variant">
      <div className="max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-center gap-md">
        <div className="flex items-center gap-sm">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD88MS5FU6EtPF-vJLx-DL2M3TjIyO4qY0wsfac3SmC1An05vKF1LzQ5h4r9ycOps9j16WQXyEDaLyx8l83lNcKFrS5ary3sC7V8u2prHZwHA36wgDoRjDPQF88mkbGsU_eJMtY2vuNckbB37DV9TFPPxdzcafCXadEmSLQIpqtgZlgLoacns0WLg4UksYcl-5NLLAnwhjfrKg-NW0QgheXKaDpuY_iznKIdT1B_9bdZ6BCnCjbEuY9OR48K3OTT52VEA"
            alt="AstraFinance AI Logo"
            className="h-12 w-auto object-contain"
          />
        </div>
        <div className="flex gap-lg">
          <Link
            className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors"
            href="#"
          >
            Help Center
          </Link>
          <Link
            className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors"
            href="#"
          >
            Company Info
          </Link>
          <Link
            className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors"
            href="#"
          >
            Privacy Policy
          </Link>
        </div>
        <div className="font-body-sm text-body-sm text-on-surface-variant">
          © 2024 AstraFinance AI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
