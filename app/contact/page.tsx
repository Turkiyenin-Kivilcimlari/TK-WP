"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Mail, MapPin, Clock, Send, Instagram, Linkedin, Youtube } from "lucide-react";
import { toast } from "sonner";
import api from '@/lib/api';
import React from "react";

// Sosyal medya bağlantıları - lucide-react ikonlarıyla
const socialLinks = [
  { name: "E-posta", icon: "Mail", href: "mailto:info@turkiyeninkivilcimlari.com" },
  { name: "Instagram", icon: "Instagram", href: "https://www.instagram.com/turkiyeninkivilcimlari/" },
  { name: "LinkedIn", icon: "LinkedIn", href: "https://www.linkedin.com/company/turkiyeninkivilcimlari" },
  { name: "YouTube", icon: "YouTube", href: "https://www.youtube.com/@TurkiyeninKivilcimlari" },
  { name: "Discord", icon: "Discord", href: "https://discord.gg/PkqsRjKhK8" },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [touchedFields, setTouchedFields] = useState<{
    [key: string]: boolean;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "name") {
      const filteredValue = value.replace(/\d/g, '');
      setFormData({
        ...formData,
        [name]: filteredValue,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }

    if (!touchedFields[name]) {
      setTouchedFields({
        ...touchedFields,
        [name]: true,
      });
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name } = e.target;

    setTouchedFields({
      ...touchedFields,
      [name]: true,
    });
  };

  useEffect(() => {
    const newErrors: { [key: string]: string } = {};

    if (touchedFields.name) {
      if (!formData.name.trim()) {
        newErrors.name = "İsim alanı zorunludur";
      } else if (/\d/.test(formData.name)) {
        newErrors.name = "İsim alanında sayı kullanılamaz";
      } else if (formData.name.trim().length < 3) {
        newErrors.name = "İsim en az 3 karakter olmalıdır";
      }
    }

    if (touchedFields.email) {
      if (!formData.email.trim()) {
        newErrors.email = "E-posta alanı zorunludur";
      } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
        newErrors.email = "Geçerli bir e-posta adresi giriniz";
      }
    }

    if (touchedFields.subject) {
      if (!formData.subject.trim()) {
        newErrors.subject = "Konu alanı zorunludur";
      } else if (formData.subject.trim().length < 5) {
        newErrors.subject = "Konu en az 5 karakter olmalıdır";
      }
    }

    if (touchedFields.message) {
      if (!formData.message.trim()) {
        newErrors.message = "Mesaj alanı zorunludur";
      } else if (formData.message.trim().length < 10) {
        newErrors.message = "Mesajınız en az 10 karakter olmalıdır";
      }
    }

    setErrors(newErrors);
  }, [formData, touchedFields]);

  const validateForm = () => {
    const allTouched = Object.keys(formData).reduce((acc, key) => {
      return { ...acc, [key]: true };
    }, {});

    setTouchedFields(allTouched);

    return (
      Object.keys(errors).length === 0 &&
      formData.name.trim() !== "" &&
      formData.email.trim() !== "" &&
      formData.subject.trim() !== "" &&
      formData.message.trim() !== ""
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Lütfen formdaki hataları düzeltin.", {
        description: "Form hatası",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post("/api/contact", formData);

      if (!response.data.success) {
        throw new Error("Form gönderilemedi");
      }

      toast.success("Form gönderildi", {
        description:
          "Mesajınız başarıyla iletildi. En kısa sürede size dönüş yapacağız.",
      });

      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });

      setTouchedFields({});
    } catch (error: any) {
      toast.error("Form gönderilirken bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight">İletişim</h1>
        <p className="text-xl text-muted-foreground mt-4 max-w-3xl mx-auto">
          Sorularınız veya iş birliği teklifleri için bizimle iletişime
          geçebilirsiniz.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Bize Ulaşın</CardTitle>
              <CardDescription>
                Formu doldurarak bizimle iletişime geçebilirsiniz. En kısa
                sürede size geri dönüş yapacağız.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      Adınız Soyadınız
                    </label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Adınız Soyadınız"
                      value={formData.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={
                        errors.name && touchedFields.name
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {errors.name && touchedFields.name && (
                      <p className="text-sm text-red-500">{errors.name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      E-posta Adresiniz
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="ornek@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={
                        errors.email && touchedFields.email
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {errors.email && touchedFields.email && (
                      <p className="text-sm text-red-500">{errors.email}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="subject" className="text-sm font-medium">
                    Konu
                  </label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="Mesajınızın konusu"
                    value={formData.subject}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={
                      errors.subject && touchedFields.subject
                        ? "border-red-500"
                        : ""
                    }
                  />
                  {errors.subject && touchedFields.subject && (
                    <p className="text-sm text-red-500">{errors.subject}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium">
                    Mesajınız
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Mesajınızı buraya yazın..."
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={
                      errors.message && touchedFields.message
                        ? "border-red-500"
                        : ""
                    }
                  />
                  {errors.message && touchedFields.message && (
                    <p className="text-sm text-red-500">{errors.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4 mr-1"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        ></path>
                      </svg>
                      Gönderiliyor...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Gönder
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Tabs defaultValue="contact" className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="contact">İletişim</TabsTrigger>
              <TabsTrigger value="location">Lokasyon</TabsTrigger>
            </TabsList>
            <TabsContent value="contact" className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-semibold">E-posta</h4>
                        <p className="text-sm text-muted-foreground">
                          info@turkiyeninkivilcimlari.com
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-semibold">Adres</h4>
                        <p className="text-sm text-muted-foreground">
                          İstanbul / Türkiye
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="location">
              <Card>
                <CardContent className="p-0">
                  <div className="aspect-video w-full h-[300px] bg-muted rounded-md overflow-hidden">
                    <iframe
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d192697.79327595372!2d28.85571693631411!3d41.005495947809685!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14caa7040068086b%3A0xe1ccfe98bc01b0d0!2zxLBzdGFuYnVs!5e0!3m2!1str!2str!4v1658653332432!5m2!1str!2str"
                      style={{ border: 0 }}
                      allowFullScreen={true}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="w-full h-full"
                    ></iframe>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle>Sosyal Medya</CardTitle>
              <CardDescription>Bizi sosyal medya hesaplarımızdan takip edin</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-3">
                {socialLinks.map((social) => {
                  return (
                  <Button 
                    key={social.name}
                    variant="outline" 
                    size="icon" 
                    asChild
                    className="transition-all duration-300 hover:scale-110 hover:shadow-md hover:bg-primary/10"
                  >
                    <a 
                    href={social.href}
                    aria-label={`${social.name} hesabımız`}
                    target="_blank" 
                    rel="noreferrer"
                    >
                    {social.name === "Discord" ? (
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
                    </a>
                  </Button>
                  );
                })}
                </div>
              
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
