"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import type { NavigationItem } from "@/config/site";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileNavigation({ items }: { items: NavigationItem[] }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
        <Menu aria-hidden="true" />
        <span className="sr-only">Ouvrir la navigation</span>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <nav className="grid gap-2 px-4" aria-label="Navigation mobile">
          {items.map((item) => (
            <SheetClose key={item.href} render={<Link href={item.href} />}>
              <span className="block rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                {item.label}
              </span>
            </SheetClose>
          ))}
        </nav>
        <div className="px-4">
          <ThemeToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
}
