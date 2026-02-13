"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/markets", label: "Markets" },
  { href: "/create", label: "Create" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">&#x1F52E;</span>
              <span className="text-xl font-bold text-gradient">
                MetaPredict
              </span>
            </Link>

            <nav className="hidden sm:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "text-accent bg-accent/10"
                        : "text-muted hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan/10 border border-cyan/20">
              <span className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
              <span className="text-xs font-mono text-cyan">Base Sepolia</span>
            </div>
            <ConnectButton
              chainStatus="none"
              showBalance={false}
              accountStatus="address"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
