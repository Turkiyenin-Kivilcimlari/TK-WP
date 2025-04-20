"use client";

import Link from "next/link";
import { DIcons } from "dicons";
 

import ThemeToogle from "@/components/ui/footer";

const navigation = {
  categories: [
    {
      id: "women",
      name: "Women",

      sections: [
        {
          id: "about",
          name: "About",
          items: [
            { name: "About", href: "/about" },
            { name: "Works", href: "/agency/works" },
            { name: "Pricing", href: "/pricing" },
          ],
        },
        {
          id: "features",
          name: "Features",
          items: [
            { name: "Products", href: "/products" },
            { name: "Agency", href: "/agency" },
            { name: "Dashboard", href: "/dashboard" },
          ],
        },
        {
          id: "products",
          name: "Products",
          items: [
            { name: "DIcons", href: "/products/dicons" },
            { name: "DShapes", href: "/products/dshapes" },
            { name: "Graaadients", href: "/products/graaadients" },
          ],
        },
        {
          id: "designs",
          name: "Designs",
          items: [
            { name: "Design", href: "/designs" },
            { name: "Components", href: "/components" },
            { name: "Blogs", href: "/blogs" },
          ],
        },
        {
          id: "other",
          name: "Others",
          items: [
            { name: "Graphic", href: "/graphic" },
            { name: "3D Icons", href: "/products/3dicons" },
            { name: "Colors", href: "/products/colors/generate" },
          ],
        },
        {
          id: "company",
          name: "Company",
          items: [
            { name: "Contact", href: "/contact" },
            { name: "Terms", href: "/terms" },
            { name: "Privacy", href: "/privacy" },
          ],
        },
      ],
    },
  ],
};

const Underline = `hover:-translate-y-1 border border-dotted rounded-xl p-2.5 transition-transform `;

export function Footer() {
  return (
    <footer className="border-ali/20 :px-4 mx-auto w-full border-b   border-t  px-2">
      <div className="relative mx-auto grid  max-w-7xl items-center justify-center gap-6 p-10 pb-0 md:flex ">
        <Link href="/">
          <p className="flex items-center justify-center rounded-full  ">
            <DIcons.Designali className="w-8 text-red-600" />
          </p>
        </Link>
        <p className="bg-transparent text-center text-xs leading-4 text-dark dark:text-white md:text-left">
        Türkiye’nin Kıvılcımları, geleceğin bilim ve teknoloji liderlerini yetiştirmeyi amaçlayarak gençlerin sesini duyurur, sektör profesyonelleri ile gençleri buluşturur ve iş birliği imkanı sağlar.
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="border-b border-dotted"> </div>
        <div className="py-10">
          {navigation.categories.map((category) => (
            <div
              key={category.name}
              className="grid grid-cols-3 flex-row justify-between gap-6 leading-6 md:flex"
            >
              {category.sections.map((section) => (
                <div key={section.name}>
                  <ul
                    role="list"
                    aria-labelledby={`${category.id}-${section.id}-heading-mobile`}
                    className="flex flex-col space-y-2"
                  >
                    {section.items.map((item) => (
                      <li key={item.name} className="flow-root">
                        <Link
                          href={item.href}
                          className="text-sm text-slate-600 hover:text-black dark:text-slate-400 hover:dark:text-white md:text-xs"
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="border-b border-dotted"> </div>
      </div>

      <div className="flex flex-wrap justify-center gap-y-6">
        <div className="flex flex-wrap items-center justify-center gap-6 gap-y-4 px-6">
          <Link
            aria-label="Logo"
            href=""
            rel="noreferrer"
            target="_blank"
            className={Underline}
          >
            <DIcons.Mail strokeWidth={1.5} className="h-5 w-5" />
          </Link>
          <Link
            aria-label="Logo"
            href=""
            rel="noreferrer"
            target="_blank"
            className={Underline}
          >
            <DIcons.X className="h-5 w-5" />
          </Link>
          <Link
            aria-label="Logo"
            href=""
            rel="noreferrer"
            target="_blank"
            className={Underline}
          >
            <DIcons.Instagram className="h-5 w-5" />
          </Link>
          <Link
            aria-label="Logo"
            href=""
            rel="noreferrer"
            target="_blank"
            className={Underline}
          >
            <DIcons.Facebook className="h-5 w-5" />
          </Link>
          <Link
            aria-label="Logo"
            href=""
            rel="noreferrer"
            target="_blank"
            className={Underline}
          >
            <DIcons.LinkedIn className="h-5 w-5" />
          </Link>
          <Link
            aria-label="Logo"
            href=""
            rel="noreferrer"
            target="_blank"
            className={Underline}
          >
            <DIcons.YouTube className="h-5 w-5" />
          </Link>
        </div>
        <ThemeToogle />
      </div>

      <div className="mx-auto mb-10 mt-10 flex flex-col justify-between text-center text-xs md:max-w-7xl">
        <div className="flex flex-row items-center justify-center gap-1 text-slate-600 dark:text-slate-400">
          <span> © </span>
          <span>{new Date().getFullYear()}</span>
          <span>Made with by</span>
          <span className="hover:text-ali dark:hover:text-ali cursor-pointer text-black dark:text-white">
            <Link
              aria-label="Logo"
              className="font-bold"
              href="https://kemalcalak.com"
              target="_blank"
            >
              Ali Kemal Çalak {""}
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
