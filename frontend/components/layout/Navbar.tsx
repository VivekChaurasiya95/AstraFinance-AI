import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="w-full absolute top-0 left-0 z-50 px-6 md:px-12 lg:px-24 h-20 flex items-center justify-between max-w-[1600px] mx-auto right-0">
      <div className="flex items-center gap-4">
        <Link href="/">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBExfs6K881gm0CGOOHM4tL_81SA558LDfY7FGgPWL-S3jLaZijD2_9f4bv3uafDo6sBwXOg1rBbMe3QRd_mxX8ZQQOFaEYbasZz7U7v7k-VVpX95C3F6T_5Mvx07l5wEewNupGK_XRKA7OhkoP1ahIb-ATWvFDvtXaoAn3guMf41cYu-euTDeHFdLSQMVbIZXYBU5wHrgvCPSkAiZdA2_BcyDoZuo3bZn-2A_Qw97wtktNcAOTDnSj0tGMVOoP7tlQAQ"
            alt="AstraFinance AI Logo"
            className="h-10 md:h-12 w-auto object-contain"
          />
        </Link>
      </div>
      <div className="flex items-center gap-4 md:gap-6">
        <Link
          href="/login"
          className="text-sm md:text-base font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          Login
        </Link>
        <Link href="/register">
          <Button className="bg-blue-700 hover:bg-blue-800 text-white font-medium px-4 md:px-6 py-2 rounded-md transition-opacity shadow-sm text-sm md:text-base">
            Get Started
          </Button>
        </Link>
      </div>
    </header>
  );
}
