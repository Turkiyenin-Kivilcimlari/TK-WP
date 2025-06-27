"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import api from "@/lib/api";
import Link from "next/link";

// Form schema from the apply page
const formSchema = z.object({
  schoolName: z
    .string()
    .min(3, { message: "Okul adı en az 3 karakter olmalı" }),
  contactInfo: z
    .string()
    .min(5, { message: "Telefon numarası en az 5 karakter olmalı" })
    .regex(/^[0-9+]+$/, {
      message: "Telefon numarası sadece rakam ve + içerebilir",
    }),
  emailAddress: z
    .string()
    .email({ message: "Geçerli bir e-posta adresi giriniz" }),
  socialMedia: z.array(z.string()).optional(),
  linkedinUrl: z.string().optional(),
  department: z
    .string()
    .min(3, { message: "Bölüm adı en az 3 karakter olmalı" }),
  grade: z.enum(["1", "2", "3", "4", "5+"], {
    message: "Lütfen sınıfınızı seçin",
  }),
  contactChannel: z.enum(["LinkedIn", "Instagram", "Website", "Other"], {
    message: "Lütfen iletişim kanalınızı seçin",
  }),
  additionalInfo: z.string().optional(),
  experience: z.string().optional(),
  skillsOrResources: z.string().optional(),
  communityVision: z
    .string()
    .min(10, { message: "Bu alan en az 10 karakter olmalı" }),
  communityExpectation: z
    .string()
    .min(10, { message: "Bu alan en az 10 karakter olmalı" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditApplicationPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [application, setApplication] = useState<any>(null);

  // Telefon numarası için tuş filtresi
  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Sayı tuşları, +, Delete, Backspace, Sol ve Sağ ok tuşlarına izin ver
    const allowedKeys = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Tab",
      "+",
    ];

    // Eğer tuş bir rakam değilse ve izin verilen tuşlardan biri değilse engelle
    if (!/^\d$/.test(e.key) && !allowedKeys.includes(e.key)) {
      e.preventDefault();
    }
  };

  // Form definition
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      schoolName: "",
      contactInfo: "",
      emailAddress: "",
      socialMedia: [],
      linkedinUrl: "",
      department: "",
      grade: "1",
      contactChannel: "LinkedIn",
      additionalInfo: "",
      experience: "",
      skillsOrResources: "",
      communityVision: "",
      communityExpectation: "",
    },
  });

  // Fetch application data
  useEffect(() => {
    if (status === "authenticated") {
      fetchApplication();
    } else if (status === "unauthenticated") {
      router.push(
        "/signin?callbackUrl=" + encodeURIComponent(`/applications/edit/${id}`)
      );
    }
  }, [status, id]);

  const fetchApplication = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/applications/${id}`);

      if (response.data.application) {
        setApplication(response.data.application);

        // Check if this is the user's own application
        if (response.data.application.userId !== session?.user?.id) {
          toast.error("Bu başvuruyu düzenleme yetkiniz yok.");
          router.push("/applications");
          return;
        }

        // Check if application is still in pending status
        if (response.data.application.status !== "pending") {
          toast.error("Sadece beklemede olan başvurular düzenlenebilir.");
          router.push("/applications");
          return;
        }

        // Set form values from fetched application
        form.reset({
          schoolName: response.data.application.schoolName || "",
          contactInfo: response.data.application.contactInfo || "",
          emailAddress: response.data.application.emailAddress || "",
          socialMedia: response.data.application.socialMedia || [],
          linkedinUrl: response.data.application.linkedinUrl || "",
          department: response.data.application.department || "",
          grade: response.data.application.grade || "1",
          contactChannel:
            response.data.application.contactChannel || "LinkedIn",
          additionalInfo: response.data.application.additionalInfo || "",
          experience: response.data.application.experience || "",
          skillsOrResources: response.data.application.skillsOrResources || "",
          communityVision: response.data.application.communityVision || "",
          communityExpectation:
            response.data.application.communityExpectation || "",
        });
      } else {
        toast.error("Başvuru bulunamadı.");
        router.push("/applications");
      }
    } catch (error) {
      toast.error("Başvuru yüklenirken bir hata oluştu.");
      router.push("/applications");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSaving(true);

      // Add updatedBy field
      const updateData = {
        ...values,
        updatedBy: "user",
      };

      // Update application
      await api.put(`/api/applications/${id}`, updateData);

      toast.success("Başvurunuz başarıyla güncellendi!");
      router.push("/applications");
    } catch (error: any) {
      toast.error(
        "Başvuru güncellenirken bir hata oluştu: " +
          ("Bilinmeyen hata")
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center items-center py-6 px-4 sm:py-12 sm:px-6">
      <div className="container max-w-full sm:max-w-3xl">
        <Card className="w-full mx-auto shadow-md">
          <CardHeader className="pb-4 sm:pb-6">
            <div className="flex items-center mb-2">
              <Button variant="ghost" size="sm" asChild className="p-1 sm:p-2">
                <Link
                  href="/applications"
                  className="flex items-center text-sm"
                >
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />{" "}
                  Başvurularıma Dön
                </Link>
              </Button>
            </div>
            <CardTitle className="text-xl sm:text-2xl text-center mt-2">
              Başvuruyu Düzenle
            </CardTitle>
            <CardDescription className="text-center text-sm sm:text-base">
              Beklemede olan başvurunuzu güncelleyebilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                <FormField
                  control={form.control}
                  name="contactInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon Numaranız</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0555 123 45 67"
                          {...field}
                          onKeyDown={handlePhoneKeyDown}
                        />
                      </FormControl>
                      <FormDescription>
                        Sizinle iletişime geçebileceğimiz bir telefon numarası
                        (sadece rakam ve + karakteri)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emailAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        E-Posta Adresiniz (İletişim için Kullanılacaktır)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ornek@mail.com"
                          type="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="socialMedia"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel>
                          Kullandığınız Sosyal Medya Platformları
                        </FormLabel>
                        <FormDescription>
                          Kullandığınız platformları seçiniz
                        </FormDescription>
                      </div>

                      {[
                        "LinkedIn",
                        "Facebook",
                        "Instagram",
                        "Twitter",
                        "Diğer",
                      ].map((item) => (
                        <FormField
                          key={item}
                          control={form.control}
                          name="socialMedia"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([
                                            ...(field.value || []),
                                            item,
                                          ])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== item
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {item}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="linkedinUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        LinkedIn Profiliniz (Lütfen doğrudan URL verin)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://www.linkedin.com/in/username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="schoolName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Okuduğunuz Üniversite (Tarih aralığı belirtiniz)
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Cevabınız" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Okuduğunuz Bölüm/ler</FormLabel>
                      <FormControl>
                        <Input placeholder="Cevabınız" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="grade"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Sınıfınız</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="1" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              1. Sınıf
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="2" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              2. Sınıf
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="3" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              3. Sınıf
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="4" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              4. Sınıf
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="5+" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              5. Sınıf ve üzeri
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactChannel"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>
                        Topluluğu Butonlardan Nereden Öğrendiniz?
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="LinkedIn" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              LinkedIn
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Instagram" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Instagram
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Website" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Website
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Other" />
                            </FormControl>
                            <FormLabel className="font-normal">Diğer</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        İleriki Dönem Diğer Üniversite/Yüksek Lisans/Doktora vs.
                        Adayı Olduğunuz bir Okul/Bölüm var mı?
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Cevabınız"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Daha Önceki Dernek/Topluluk Deneyimleriniz
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Cevabınız"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="skillsOrResources"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Neler Biliyor, Neleri Alıp Verebilirsiniz?
                        (Yetenekleriniz, Becerileriniz...)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Cevabınız"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="communityVision"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Türkiye'nin Kıvılcımları Community'i nasıl olmalı?
                        Sizlere neler katabileceğimize inanıyorsunuz?
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Cevabınız"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="communityExpectation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Türkiye'nin Kıvılcımları Community'i nasıl olmalı? Cevap
                        Verebilirsiniz Topluluk Hedeflerinizi ve Katılımcılar
                        arası İlişkiyi Nasıl Kurarsınız?
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Cevabınız"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between pt-4 flex-col sm:flex-row gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/applications")}
                    className="text-sm sm:text-base py-5 sm:py-2 order-2 sm:order-1"
                  >
                    İptal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="text-sm sm:text-base py-5 sm:py-2 order-1 sm:order-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4 animate-spin" />
                        <span>Kaydediliyor...</span>
                      </>
                    ) : (
                      <>
                        <Save className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                        <span>Değişiklikleri Kaydet</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
