"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Beranda" },
  { href: "/upload", label: "Upload KK" },
  { href: "/daftar-kk", label: "Daftar KK" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-green-700 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="bg-white text-green-700 rounded px-2 py-0.5 text-sm font-extrabold">KK</span>
            Pembaca KK
          </Link>

          <div className="flex gap-1">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-green-900 text-white"
                      : "text-green-100 hover:bg-green-600"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
