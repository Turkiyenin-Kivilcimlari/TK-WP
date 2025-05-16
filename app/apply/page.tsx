"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Loader2, Check } from "lucide-react";
import { useSession } from "next-auth/react";
import api from "@/lib/api";

// Form schema remains the same for complete submissions
const formSchema = z.object({
  schoolName: z.string().min(3, { message: "Okul adı en az 3 karakter olmalı" }),
  contactInfo: z.string()
    .min(5, { message: "Telefon numarası en az 5 karakter olmalı" })
    .regex(/^[0-9+]+$/, { message: "Telefon numarası sadece rakam ve + içerebilir" }),
  emailAddress: z.string().email({ message: "Geçerli bir e-posta adresi giriniz" }),
  socialMedia: z.array(z.string()).optional(),
  linkedinUrl: z.string().optional(),
  department: z.string().min(3, { message: "Bölüm adı en az 3 karakter olmalı" }),
  grade: z.enum(["1", "2", "3", "4", "5+"], { 
    message: "Lütfen sınıfınızı seçin" 
  }),
  contactChannel: z.enum(["LinkedIn", "Instagram", "Website", "Other"], {
    message: "Lütfen iletişim kanalınızı seçin"
  }),
  additionalInfo: z.string().optional(),
  experience: z.string().optional(),
  skillsOrResources: z.string().optional(),
  communityVision: z.string().min(10, { message: "Bu alan en az 10 karakter olmalı" }),
  communityExpectation: z.string().min(10, { message: "Bu alan en az 10 karakter olmalı" }),
});

// Creating a less restrictive schema for draft submissions
const draftFormSchema = z.object({
  schoolName: z.string().optional(),
  contactInfo: z.string().optional(),
  emailAddress: z.string().optional(),
  socialMedia: z.array(z.string()).optional(),
  linkedinUrl: z.string().optional(),
  department: z.string().optional(),
  grade: z.enum(["1", "2", "3", "4", "5+"], { 
    message: "Lütfen sınıfınızı seçin" 
  }).optional(),
  contactChannel: z.enum(["LinkedIn", "Instagram", "Website", "Other"], {
    message: "Lütfen iletişim kanalınızı seçin"
  }).optional(),
  additionalInfo: z.string().optional(),
  experience: z.string().optional(),
  skillsOrResources: z.string().optional(),
  communityVision: z.string().optional(),
  communityExpectation: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;
type DraftFormValues = z.infer<typeof draftFormSchema>;

export default function ApplyPage() {
  const { data: session, status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  // Telefon numarası için tuş filtresi
  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "+"];
    if (!/^\d$/.test(e.key) && !allowedKeys.includes(e.key)) {
      e.preventDefault();
    }
  };

  // Form tanımlaması - Always define hooks before any conditional returns
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      schoolName: "",
      contactInfo: "",
      emailAddress: session?.user?.email || "",
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

  // Check for existing draft when component mounts
  useEffect(() => {
    if (status === "authenticated") {
      checkForDraft();
    }
  }, [status]);

  // Handle authentication redirects with useEffect instead of conditional returns
  useEffect(() => {
    if (status === "unauthenticated") {
      setShouldRedirect(true);
      window.location.href = "/signin?callbackUrl=/apply";
    }
  }, [status]);

  // Check if user has a draft application
  const checkForDraft = async () => {
    try {
      const response = await api.get("/api/applications/draft");
      if (response.data.draft) {
        setHasDraft(true);
        setDraftId(response.data.draft._id);
        form.reset({
          schoolName: response.data.draft.schoolName || "",
          contactInfo: response.data.draft.contactInfo || "",
          emailAddress: response.data.draft.emailAddress || session?.user?.email || "",
          socialMedia: response.data.draft.socialMedia || [],
          linkedinUrl: response.data.draft.linkedinUrl || "",
          department: response.data.draft.department || "",
          grade: response.data.draft.grade || "1",
          contactChannel: response.data.draft.contactChannel || "LinkedIn",
          additionalInfo: response.data.draft.additionalInfo || "",
          experience: response.data.draft.experience || "",
          skillsOrResources: response.data.draft.skillsOrResources || "",
          communityVision: response.data.draft.communityVision || "",
          communityExpectation: response.data.draft.communityExpectation || "",
        });
      }
    } catch (error) {
      console.error("Draft kontrolü sırasında hata oluştu:", error);
    }
  };

  // Save application as draft
  const saveDraft = async () => {
    try {
      setIsSavingDraft(true);
      const formData = form.getValues();
      
      // We don't need client-side validation for drafts, we'll let the server handle it
      // Just ensure we have the bare minimum - at least something in the form
      if (Object.values(formData).every(val => !val || (Array.isArray(val) && val.length === 0))) {
        toast.error("Lütfen en az bir alanı doldurun", {
          description: "Taslak kaydetmek için en az bir alan doldurulmalıdır."
        });
        return;
      }
      
      // Add draft status to payload
      const payload = {
        ...formData,
        isDraft: true,
        // Ensure emailAddress is set to prevent validation errors
        emailAddress: formData.emailAddress || session?.user?.email || ""
      };
      
      console.log("Saving draft with payload:", payload);
      
      // Update existing draft or create new one
      const response = draftId
        ? await api.put(`/api/applications/${draftId}`, payload)
        : await api.post("/api/applications", payload);
      
      console.log("Draft save response:", response.data);
      
      if (response.data.success) {
        if (!draftId && response.data.application?._id) {
          setDraftId(response.data.application._id);
        }
        setHasDraft(true);
        setIsDraftSaved(true);
        
        toast.success("Taslak kaydedildi", {
          description: "Başvurunuz taslak olarak kaydedildi. İstediğiniz zaman tamamlayabilirsiniz."
        });
        
        // Auto-hide draft saved message after 3 seconds
        setTimeout(() => {
          setIsDraftSaved(false);
        }, 3000);
      } else {
        throw new Error(response.data.message || "Taslak kaydedilirken bir hata oluştu.");
      }
    } catch (error: any) {
      console.error("Draft save error:", error);
      toast.error("Hata!", {
        description: error.response?.data?.message || error.message || "Taslak kaydedilirken bir hata oluştu."
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Form gönderildiğinde çalışacak fonksiyon - complete submission
  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      const payload = {
        ...values,
        isDraft: false,
      };
      const response = draftId
        ? await api.put(`/api/applications/${draftId}`, payload)
        : await api.post("/api/applications", payload);
      if (response.data.success) {
        setIsSuccess(true);
        setHasDraft(false);
        setDraftId(null);
        toast.success("Başvuru alındı!", {
          description: "Başvurunuz başarıyla alındı. En kısa sürede sizinle iletişime geçeceğiz.",
        });
      } else {
        throw new Error(response.data.message || "Başvuru gönderilirken bir hata oluştu.");
      }
    } catch (error: any) {
      toast.error("Hata!", {
        description: error.response?.data?.message || error.message || "Başvuru gönderilirken bir hata oluştu.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (shouldRedirect || status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen justify-center items-center">
        <Card className="w-full max-w-3xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <Check className="h-8 w-8 text-green-600 dark:text-green-300" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">Başvurunuz Alındı!</CardTitle>
            <CardDescription className="text-center text-lg">
              Başvurunuzu aldık ve incelemeye başladık. En kısa sürede sizinle iletişime geçeceğiz.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => window.location.href = "/"}>Ana Sayfaya Dön</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center items-center py-6 px-4 sm:py-12 sm:px-6">
      <div className="container max-w-full sm:max-w-3xl">
        <Card className="w-full mx-auto shadow-md">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl text-center">Topluluk Temsilcisi Başvuru Formu</CardTitle>
            <CardDescription className="text-center text-sm sm:text-base">
              Türkiye'nin Kıvılcımları topluluğuna katılmak için lütfen aşağıdaki formu doldurun.
              {hasDraft && (
                <p className="mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                  Taslak başvurunuz bulunmaktadır. Formu doldurup gönderebilir veya güncellemeye devam edebilirsiniz.
                </p>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                        Sizinle iletişime geçebileceğimiz bir telefon numarası (sadece rakam ve + karakteri)
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
                      <FormLabel>E-Posta Adresiniz (İletişim için Kullanılacaktır)</FormLabel>
                      <FormControl>
                        <Input placeholder="ornek@mail.com" type="email" {...field} />
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
                        <FormLabel>Kullandığınız Sosyal Medya Platformları</FormLabel>
                        <FormDescription>
                          Kullandığınız platformları seçiniz
                        </FormDescription>
                      </div>
                      
                      {["LinkedIn", "Facebook", "Instagram", "Twitter", "Diğer"].map((item) => (
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
                                        ? field.onChange([...field.value || [], item])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== item
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {item}
                                </FormLabel>
                              </FormItem>
                            )
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
                      <FormLabel>LinkedIn Profiliniz (Lütfen doğrudan URL verin)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://www.linkedin.com/in/username" {...field} />
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
                      <FormLabel>Okuduğunuz Üniversite (Tarih aralığı belirtiniz)</FormLabel>
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
                            <FormLabel className="font-normal">1. Sınıf</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="2" />
                            </FormControl>
                            <FormLabel className="font-normal">2. Sınıf</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="3" />
                            </FormControl>
                            <FormLabel className="font-normal">3. Sınıf</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="4" />
                            </FormControl>
                            <FormLabel className="font-normal">4. Sınıf</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="5+" />
                            </FormControl>
                            <FormLabel className="font-normal">5. Sınıf ve üzeri</FormLabel>
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
                      <FormLabel>Topluluğu Butonlardan Nereden Öğrendiniz?</FormLabel>
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
                            <FormLabel className="font-normal">LinkedIn</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Instagram" />
                            </FormControl>
                            <FormLabel className="font-normal">Instagram</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Website" />
                            </FormControl>
                            <FormLabel className="font-normal">Website</FormLabel>
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
                      <FormLabel>İleriki Dönem Diğer Üniversite/Yüksek Lisans/Doktora vs. Adayı Olduğunuz bir Okul/Bölüm var mı?</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Cevabınız" className="min-h-[100px]" {...field} />
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
                      <FormLabel>Daha Önceki Dernek/Topluluk Deneyimleriniz</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Cevabınız" className="min-h-[100px]" {...field} />
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
                      <FormLabel>Neler Biliyor, Neleri Alıp Verebilirsiniz? (Yetenekleriniz, Becerileriniz...)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Cevabınız" className="min-h-[100px]" {...field} />
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
                      <FormLabel>Türkiye'nin Kıvılcımları Community'i nasıl olmalı? Sizlere neler katabileceğimize inanıyorsunuz?</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Cevabınız" className="min-h-[100px]" {...field} />
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
                      <FormLabel>Türkiye'nin Kıvılcımları Community'i nasıl olmalı? Cevap Verebilirsiniz Topluluk Hedeflerinizi ve Katılımcılar arası İlişkiyi Nasıl Kurarsınız?</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Cevabınız" className="min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isDraftSaved && (
                  <div className="p-2 sm:p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-xs sm:text-sm flex items-center justify-center">
                    <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span>Başvurunuz taslak olarak kaydedildi. İstediğiniz zaman tamamlayabilirsiniz.</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    disabled={isSavingDraft || isSubmitting}
                    className="w-full text-sm sm:text-base py-5 sm:py-6"
                    onClick={saveDraft}
                  >
                    {isSavingDraft ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>Kaydediliyor...</span>
                      </>
                    ) : (
                      <span>Taslak Olarak Kaydet</span>
                    )}
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || isSavingDraft}
                    className="w-full text-sm sm:text-base py-5 sm:py-6"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>Gönderiliyor...</span>
                      </>
                    ) : (
                      <span>Başvuruyu Gönder</span>
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
