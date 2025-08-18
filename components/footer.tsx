"use client";

import Link from "next/link";
import Image from "next/image";
import React from "react";
import ThemeToogle from "@/components/ui/footer";
import { Mail, Instagram, Linkedin, Youtube } from "lucide-react";
import { AiOutlineDiscord } from "react-icons/ai";

const navigation = {
  categories: [
    {
      sections: [
        {
          id: "platform",
          name: "Platform",
          items: [
            { name: "Ana Sayfa", href: "/" },
            { name: "Etkinlikler", href: "/events" },
            { name: "Yazılar", href: "/articles" },
          ],
        },
        {
          id: "account",
          name: "Hesap",
          items: [
            { name: "Giriş Yap", href: "/signin" },
            { name: "Kayıt Ol", href: "/signup" },
            { name: "Profil", href: "/profile" },
          ],
        },
        {
          id: "community",
          name: "Topluluk",
          items: [
            { name: "Hakkımızda", href: "/about" },
            { name: "İletişim", href: "/contact" },
          ],
        },
        {
          id: "content",
          name: "İçerik",
          items: [
            { name: "Yazı Oluştur", href: "/write" },
            { name: "Yazılarım", href: "/my-articles" },
          ],
        },
        {
          id: "legal",
          name: "Yasal",
          items: [
            { name: "Kullanım Şartları", href: "/terms" },
            { name: "Gizlilik Politikası", href: "/privacy" },
            { name: "Çerez Politikası", href: "/cookies" },
          ],
        },
      ],
    },
  ],
};

// Sosyal medya bağlantıları - Lucide React ikonlarını kullanacak şekilde güncellendi
const socialLinks = [
  { name: "E-posta", icon: "Mail", href: "mailto:info@turkiyeninkivilcimlari.com" },
  { name: "Instagram", icon: "Instagram", href: "https://www.instagram.com/turkiyeninkivilcimlari/" },
  { name: "LinkedIn", icon: "LinkedIn", href: "https://www.linkedin.com/company/turkiyeninkivilcimlari" },
  { name: "YouTube", icon: "YouTube", href: "https://www.youtube.com/@TurkiyeninKivilcimlari" },
  { name: "Discord", icon: "Discord", href: "https://discord.gg/PkqsRjKhK8" },
];

const Underline = `hover:-translate-y-1 border border-dotted rounded-xl p-2.5 transition-transform `;

export function Footer() {
  return (
    <footer className="border-ali/20 mx-auto w-full border-b border-t px-2">
      <div className="relative mx-auto grid max-w-7xl items-center justify-center gap-6 p-10 pb-0 md:flex">
        <Link href="/">
          <p className="flex items-center justify-center rounded-full">
            <Image
              src="https://res.cloudinary.com/dkqu2s9gz/image/upload/v1742649496/eewobokrrfmwt5maygoh.png"
              alt="Logo"
              width={48}
              height={48}
              className="object-contain"
            />
          </p>
        </Link>
        <p className="bg-transparent text-center text-xs leading-4 text-dark dark:text-white md:text-left">
          Türkiye'nin Kıvılcımları, geleceğin bilim ve teknoloji liderlerini
          yetiştirmeyi amaçlayarak gençlerin sesini duyurur, sektör
          profesyonelleri ile gençleri buluşturur ve iş birliği imkanı sağlar.
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="border-b border-dotted"></div>
        <div className="py-10">
          {navigation.categories.map((category, index) => (
            <div
              key={index}
              className="grid grid-cols-2 sm:grid-cols-3 md:flex flex-row justify-between gap-6 leading-6"
            >
              {category.sections.map((section) => (
                <div key={section.id} className="mb-6 md:mb-0">
                  <h3 className="font-semibold text-sm mb-3">{section.name}</h3>
                  <ul
                    role="list"
                    aria-labelledby={`${index}-${section.id}-heading-mobile`}
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
        <div className="border-b border-dotted"></div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h3 className="font-semibold text-sm mb-3 text-center md:text-left">Bizi Takip Edin</h3>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              {socialLinks.map((social) => {
                return (
                  <Link
                    key={social.name}
                    aria-label={`${social.name} hesabımız`}
                    href={social.href}
                    rel="noreferrer"
                    target="_blank"
                    className={Underline}
                  >
                    {social.name === "Discord" ? (
                      <AiOutlineDiscord className="h-5 w-5" />
                    ) : social.name === "E-posta" ? (
                      <Mail className="h-5 w-5" strokeWidth={1.5} />
                    ) : social.name === "Instagram" ? (
                      <Instagram className="h-5 w-5" />
                    ) : social.name === "LinkedIn" ? (
                      <Linkedin className="h-5 w-5" />
                    ) : social.name === "YouTube" ? (
                      <Youtube className="h-5 w-5" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
          
          <ThemeToogle />
        </div>
      </div>

      <div className="mx-auto mb-10 mt-10 flex flex-col justify-between text-center text-xs md:max-w-7xl">
        <div className="flex flex-row items-center justify-center gap-1 text-slate-600 dark:text-slate-400">
          <span>©</span>
          <span>{new Date().getFullYear()}</span>
          <span>Made with by</span>
          <span className="hover:text-ali dark:hover:text-ali cursor-pointer text-black dark:text-white">
            <Link
              aria-label="Geliştirici Web Sitesi"
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
