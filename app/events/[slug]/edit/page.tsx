"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EventType, EventStatus } from "@/models/Event";
import { UserRole } from "@/models/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, CalendarIcon, Clock, Loader2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import api from "@/lib/api";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Image from "next/image";

// Form şema
const eventFormSchema = z.object({
  title: z
    .string()
    .min(5, "Başlık en az 5 karakter olmalıdır")
    .max(100, "Başlık en fazla 100 karakter olabilir"),
  description: z
    .string()
    .min(20, "Açıklama en az 20 karakter olmalıdır")
    .max(5000, "Açıklama en fazla 5000 karakter olabilir"),
  eventDate: z.date({
    required_error: "Etkinlik tarihi zorunludur",
  }),
  eventTime: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Geçerli bir saat giriniz (HH:MM)"),
  eventType: z.enum(["IN_PERSON", "ONLINE", "HYBRID"], {
    required_error: "Etkinlik türü seçmelisiniz",
  }),
  location: z.string().optional(),
  onlineUrl: z.string().url("Geçerli bir URL giriniz").optional(),
  coverImage: z.string().min(1, "Etkinlik görseli zorunludur"),
});

// Admin form şeması
const adminEventFormSchema = eventFormSchema.extend({
  status: z.enum(["PENDING_APPROVAL", "APPROVED", "REJECTED"], {
    required_error: "Durum seçmelisiniz",
  }),
});

export default function EditEventPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Kullanıcı rolünü kontrol et
  const userRole = session?.user?.role;
  const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN;

  // Admin formunu veya normal formunu seç
  const formSchema = isAdmin ? adminEventFormSchema : eventFormSchema;
  type FormValues = z.infer<typeof formSchema>;
  type AdminFormValues = z.infer<typeof adminEventFormSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      eventDate: new Date(),
      eventTime: "",
      eventType: EventType.IN_PERSON,
      location: "",
      onlineUrl: "",
      coverImage: "",
      ...(isAdmin && { status: EventStatus.PENDING_APPROVAL }),
    },
  });

  // Etkinlik verilerini getir
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/api/events/${slug}`);
        const eventData = response.data.event;
        
        // Form değerlerini ayarla
        form.reset({
          title: eventData.title,
          description: eventData.description,
          eventDate: new Date(eventData.eventDate),
          eventTime: format(new Date(eventData.eventDate), "HH:mm"),
          eventType: eventData.eventType as EventType,
          location: eventData.location || "",
          onlineUrl: eventData.onlineUrl || "",
          coverImage: eventData.coverImage || "",
          ...(isAdmin && { status: eventData.status as EventStatus }),
        });
        
        setCoverImage(eventData.coverImage);
        setEvent(eventData);
        setIsLoading(false);
      } catch (error: any) {
        toast.error("Etkinlik bulunamadı", {
          description: "Bu etkinlik mevcut değil veya yüklenirken bir hata oluştu.",
        });
        router.push("/events");
      }
    };

    if (session && slug) {
      fetchEvent();
    }
  }, [slug, session, form, router, isAdmin]);

  // Görsel yükleme işlevi
  const handleImageUpload = async (file: File) => {
    if (!file) return null;
    
    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await api.post('/api/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data?.url) {
        setCoverImage(response.data.url);
        form.setValue('coverImage', response.data.url);
        return response.data.url;
      }
      
      return null;
    } catch (error) {
      toast.error('Görsel yüklenirken bir hata oluştu');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Form gönderme
  const onSubmit = async (data: FormValues) => {
    try {
      setIsSaving(true);
      
      // Tarih ve saat birleştirme
      const [hours, minutes] = data.eventTime.split(':').map(Number);
      const eventDateTime = new Date(data.eventDate);
      eventDateTime.setHours(hours, minutes);
      
      // API'ye gönderilecek veri
      let eventData: any = {
        ...data,
        eventDate: eventDateTime.toISOString(),
        coverImage: coverImage,
      };
      
      // Admin olmayan kullanıcılar için durumu her zaman PENDING_APPROVAL olarak ayarla
      if (!isAdmin) {
        eventData.status = EventStatus.PENDING_APPROVAL;
      } 
      // Admin için ya seçilen durumu kullan ya da varsayılan olarak APPROVED
      else if (isAdmin) {
        const adminData = data as AdminFormValues;
        eventData.status = adminData.status || EventStatus.APPROVED;
      }
      
      // Etkinliği güncelle
      await api.put(`/api/events/${slug}`, eventData);
      
      // Kullanıcı tipine ve etkinlik durumuna göre bildirim mesajı göster
      if (isAdmin) {
        if (eventData.status === EventStatus.APPROVED) {
          toast.success("Etkinlik başarıyla güncellendi ve onaylandı", {
            description: "Etkinlikler sayfasına yönlendiriliyorsunuz.",
          });
        } else if (eventData.status === EventStatus.PENDING_APPROVAL) {
          toast.success("Etkinlik başarıyla güncellendi ve bekleme durumuna alındı", {
            description: "Etkinlikler sayfasına yönlendiriliyorsunuz.",
          });
        } else if (eventData.status === EventStatus.REJECTED) {
          toast.success("Etkinlik başarıyla güncellendi ve reddedildi", {
            description: "Etkinlikler sayfasına yönlendiriliyorsunuz.",
          });
        }
      } else {
        toast.success("Etkinlik başarıyla güncellendi ve onaya gönderildi", {
          description: "Etkinliğiniz admin onayına gönderildi. Onaylandıktan sonra yayınlanacaktır.",
        });
      }
      
      router.push(`/events/${slug}`);
    } catch (error: any) {
      toast.error("Etkinlik güncellenemedi");
    } finally {
      setIsSaving(false);
    }
  };

  // Yükleniyor durumu
  if (status === "loading" || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Etkinlik yükleniyor...</span>
      </div>
    );
  }

  // Oturum açılmamışsa giriş sayfasına yönlendir
  if (status === "unauthenticated") {
    router.push("/signin?callbackUrl=" + encodeURIComponent(`/events/${slug}/edit`));
    return null;
  }

  // Etkinlik bulunamadıysa
  if (!event) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold mb-6">Etkinlik Bulunamadı</h1>
        <p className="mb-6">Bu etkinlik mevcut değil veya yüklenirken bir hata oluştu.</p>
        <Button asChild>
          <Link href="/events">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Etkinlikler Sayfasına Dön
          </Link>
        </Button>
      </div>
    );
  }

  // Yetki kontrolü
  const isAuthor = session?.user?.id === event?.author?.id;
  
  if (!isAdmin && !isAuthor) {
    router.push("/events");
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" asChild className="mb-6">
          <Link href={`/events/${slug}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Etkinliğe Dön
          </Link>
        </Button>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Etkinliği Düzenle</h1>
            {event.status === EventStatus.REJECTED && (
              <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-md">
                <h3 className="text-red-700 font-medium mb-1">Reddedilme Nedeni:</h3>
                <p className="text-red-600">{event.rejectionReason || "Neden belirtilmemiş"}</p>
              </div>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etkinlik Başlığı *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Etkinlik başlığını girin" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etkinlik Açıklaması *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Etkinlik detaylarını girin"
                        className="min-h-[150px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Etkinlik Tarihi *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: tr })
                              ) : (
                                <span>Tarih seçin</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            locale={tr}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="eventTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Etkinlik Saati *</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          placeholder="Örn: 18:00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etkinlik Türü *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Etkinlik türü seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={EventType.IN_PERSON}>
                          Fiziksel (Yüz Yüze)
                        </SelectItem>
                        <SelectItem value={EventType.ONLINE}>Online</SelectItem>
                        <SelectItem value={EventType.HYBRID}>
                          Hibrit (Fiziksel + Online)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(form.watch("eventType") === EventType.IN_PERSON ||
                form.watch("eventType") === EventType.HYBRID) && (
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Etkinlik Konumu *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Örn: Atatürk Kültür Merkezi, İstanbul"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {(form.watch("eventType") === EventType.ONLINE ||
                form.watch("eventType") === EventType.HYBRID) && (
                <FormField
                  control={form.control}
                  name="onlineUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Online Bağlantı *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Örn: https://zoom.us/j/123456789"
                        />
                      </FormControl>
                      <FormDescription>
                        Zoom, Teams, Google Meet veya benzeri bir platform bağlantısı
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="coverImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etkinlik Görseli *</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full gap-2"
                            onClick={() => document.getElementById("coverImage")?.click()}
                            disabled={isUploading}
                          >
                            {isUploading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            {field.value ? "Görseli Değiştir" : "Görsel Yükle"}
                          </Button>
                          <input
                            id="coverImage"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const imageUrl = await handleImageUpload(file);
                                if (imageUrl) {
                                  field.onChange(imageUrl);
                                }
                              }
                            }}
                            disabled={isUploading}
                          />
                        </div>
                        
                        {field.value && (
                          <div className="relative aspect-[4/3] w-full max-w-[400px] overflow-hidden rounded-md border mx-auto">
                            <Image
                              src={field.value}
                              alt="Etkinlik kapak görseli"
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        
                        {isUploading && (
                          <div className="text-sm text-muted-foreground animate-pulse">
                            Görsel yükleniyor...
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      16:9 veya 4:3 oranında bir görsel ekleyin
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isAdmin && (
                <FormField
                  control={(form as unknown as UseFormReturn<AdminFormValues>).control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Etkinlik Durumu</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Durum seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={EventStatus.PENDING_APPROVAL}>
                            Onay Bekliyor
                          </SelectItem>
                          <SelectItem value={EventStatus.APPROVED}>
                            Onaylanmış
                          </SelectItem>
                          <SelectItem value={EventStatus.REJECTED}>
                            Reddedilmiş
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/events/${slug}`)}
                  disabled={isSaving}
                >
                  İptal
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    "Kaydet"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
