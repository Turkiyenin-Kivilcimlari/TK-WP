"use client";

import Link from "next/link";
import Image from "next/image";
import React from "react";
import ThemeToogle from "@/components/ui/footer";
import { Mail, Instagram, Linkedin, Youtube } from "lucide-react";

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
                      // Discord özel ikonu
                      <svg className="h-5 w-5" viewBox="0 -28.5 256 256" xmlns="http://www.w3.org/2000/svg">
                        <path d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320965 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z" fill="currentColor" fillRule="nonzero" />
                      </svg>
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
