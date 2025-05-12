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
import { AiOutlineDiscord } from "react-icons/ai";

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
                      <AiOutlineDiscord className="h-5 w-5"/>
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
