import Link from "next/link";

import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { CartSummaryLink } from "@/components/storefront/cart-summary-link";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-heading text-2xl font-semibold text-foreground">
          {siteConfig.name}
        </Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Navigation principale">
          {siteConfig.navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <CartSummaryLink />
          <Link href="/connexion" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Admin
          </Link>
          <MobileNavigation items={siteConfig.navigation} />
        </div>
      </div>
    </header>
  );
}
