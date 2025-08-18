"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { EventStatus, EventType } from "@/models/Event";
import { UserRole } from "@/models/User";
import { CalendarIcon, Loader2, PlusCircle, Trash } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useCreateEvent, useUpdateEvent } from "@/hooks/useEvents";
import { useUploadImage } from "@/hooks/useUploadImage";

// Etkinlik günü şeması - her gün kendi eventType'ına sahip olacak
const eventDaySchema = z
  .object({
    date: z.date({
      required_error: "Etkinlik tarihi seçmelisiniz",
    }),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
      message: "Başlangıç saati HH:MM formatında olmalıdır",
    }),
    endTime: z
      .union([
        z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
          message: "Bitiş saati HH:MM formatında olmalıdır",
        }),
        z.literal(""), // Boş string de kabul edilecek
      ])
      .optional(),
    eventType: z.enum(
      [EventType.IN_PERSON, EventType.ONLINE, EventType.HYBRID],
      {
        required_error: "Etkinlik günü tipi seçmelisiniz",
      }
    ),
    location: z.string().optional(),
    onlineUrl: z
      .string()
      .refine(
        (val) => {
          if (!val) return true;
          return val.startsWith("http://") || val.startsWith("https://");
        },
        { message: "Bağlantı http:// veya https:// ile başlamalıdır" }
      )
      .optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime && data.endTime !== "") {
        return data.startTime < data.endTime;
      }
      return true;
    },
    {
      message: "Bitiş saati, başlangıç saatinden sonra olmalıdır",
      path: ["endTime"],
    }
  )
  .refine(
    (data) => {
      if (
        (data.eventType === EventType.IN_PERSON ||
          data.eventType === EventType.HYBRID) &&
        !data.location
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Fiziksel etkinlik günü için konum gereklidir",
      path: ["location"],
    }
  )
  .refine(
    (data) => {
      if (
        (data.eventType === EventType.ONLINE ||
          data.eventType === EventType.HYBRID) &&
        !data.onlineUrl
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Online etkinlik günü için bağlantı gereklidir",
      path: ["onlineUrl"],
    }
  )
  .refine(
    (data) => {
      if (
        (data.eventType === EventType.IN_PERSON ||
          data.eventType === EventType.HYBRID) &&
        (!data.endTime || data.endTime === "")
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Bitiş saati gereklidir",
      path: ["endTime"],
    }
  );

// Etkinlik formu şeması - eventDays validasyonlarını kaldırıyoruz çünkü artık her gün kendi validasyonlarını içeriyor
const eventFormSchema = z
  .object({
    title: z.string().min(2, {
      message: "Başlık en az 2 karakter olmalıdır",
    }),
    description: z.string().min(10, {
      message: "Açıklama en az 10 karakter olmalıdır",
    }),
    eventType: z.enum(
      [EventType.IN_PERSON, EventType.ONLINE, EventType.HYBRID],
      {
        required_error: "Etkinlik tipi seçmelisiniz",
      }
    ),
    coverImage: z.string({
      required_error: "Etkinlik için bir kapak görseli yüklemelisiniz",
    }),
    eventDays: z.array(eventDaySchema).min(1, {
      message: "En az bir etkinlik günü eklemelisiniz",
    }),
    status: z
      .enum([
        EventStatus.DRAFT,
        EventStatus.PENDING_APPROVAL,
        EventStatus.APPROVED,
        EventStatus.REJECTED,
      ])
      .optional(),
  })
  .refine(
    (data) => {
      const days = data.eventDays;
      if (days.length <= 1) return true;

      for (let i = 0; i < days.length - 1; i++) {
        const currentDay = days[i].date;
        const nextDay = days[i + 1].date;

        const currentDayOnly = new Date(currentDay);
        currentDayOnly.setHours(0, 0, 0, 0);

        const nextDayOnly = new Date(nextDay);
        nextDayOnly.setHours(0, 0, 0, 0);

        if (nextDayOnly <= currentDayOnly) {
          return false;
        }
      }

      return true;
    },
    {
      message:
        "Etkinlik günleri kronolojik sırada olmalıdır. Lütfen tarihleri kontrol edin.",
      path: ["eventDays"],
    }
  );

// Event form props
interface EventFormProps {
  event?: any;
  isEdit?: boolean;
}

// Event Form Bileşeni
export function EventForm({ event, isEdit = false }: EventFormProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [previewImage, setPreviewImage] = useState<string | null>(
    event?.coverImage || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { mutate: createEvent } = useCreateEvent();
  const { mutate: updateEvent } = useUpdateEvent();
  const { uploadImage } = useUploadImage();
  const [showDatesOrderError, setShowDatesOrderError] = useState(false);
  const [allowDayTypeCustomization, setAllowDayTypeCustomization] = useState(
    event?.eventType === EventType.HYBRID
  );

  const isAdmin =
    session?.user?.role === UserRole.ADMIN ||
    session?.user?.role === UserRole.SUPERADMIN;

  const defaultValues = {
    title: event?.title || "",
    description: event?.description || "",
    eventType: event?.eventType || EventType.IN_PERSON,
    coverImage: event?.coverImage || "",
    eventDays: event?.eventDays?.length
      ? event.eventDays.map((day: any) => ({
          date: day.date ? new Date(day.date) : new Date(),
          startTime: day.startTime || "",
          endTime: day.endTime || "",
          eventType: day.eventType || EventType.IN_PERSON,
          location: day.location || "",
          onlineUrl: day.onlineUrl || "",
        }))
      : [
          {
            date: new Date(),
            startTime: "",
            endTime: "",
            eventType: EventType.IN_PERSON,
            location: "",
            onlineUrl: "",
          },
        ],
    status: event?.status || EventStatus.PENDING_APPROVAL,
  };

  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
  });

  const currentEventType = form.watch("eventType");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Resim dosyası 5MB'den küçük olmalıdır");
      return;
    }

    setIsUploading(true);
    try {
      const imageUrl = await uploadImage(file);
      if (imageUrl) {
        if (
          typeof imageUrl === "object" &&
          imageUrl !== null &&
          "url" in imageUrl
        ) {
          form.setValue("coverImage", imageUrl.url);
          setPreviewImage(imageUrl.url);
        } else {
          form.setValue("coverImage", imageUrl as string);
          setPreviewImage(imageUrl as string);
        }
        form.clearErrors("coverImage");
      }
    } catch (error) {
      toast.error("Görsel yüklenirken bir hata oluştu");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    form.setValue("coverImage", "");
    setPreviewImage(null);
  };

  const onSubmit = async (values: z.infer<typeof eventFormSchema>) => {
    try {
      setIsSaving(true);

      const days = values.eventDays;
      if (days.length > 1) {
        for (let i = 0; i < days.length - 1; i++) {
          const currentDay = days[i].date;
          const nextDay = days[i + 1].date;

          const currentDayOnly = new Date(currentDay);
          currentDayOnly.setHours(0, 0, 0, 0);

          const nextDayOnly = new Date(nextDay);
          nextDayOnly.setHours(0, 0, 0, 0);

          if (nextDayOnly <= currentDayOnly) {
            setShowDatesOrderError(true);
            toast.error("Etkinlik günleri kronolojik sırada olmalıdır", {
              description: `${i + 1}. gün, ${i + 2}. günden sonra olamaz.`,
            });
            setIsSaving(false);
            return;
          }
        }
      }

      const eventData = {
        ...values,
        eventDays: values.eventDays.map((day) => ({
          ...day,
          date: day.date.toISOString(),
          endTime:
            day.eventType === EventType.ONLINE
              ? undefined
              : day.endTime || undefined,
        })),
      };

      if (isEdit && event) {
        const slug = event.slug;
        toast.loading("Etkinlik güncelleniyor...");
        updateEvent(
          { slug, eventData },
          {
            onSuccess: () => {
              toast.dismiss();
              toast.success("Etkinlik güncellendi");
              setTimeout(() => {
                router.push(isAdmin ? "/admin/events" : `/events/${slug}`);
              }, 500);
            },
            onError: (error: any) => {
              toast.dismiss();

              toast.error("Etkinlik güncellenirken bir hata oluştu");
            },
          }
        );
      } else {
        toast.loading("Etkinlik oluşturuluyor...");
        createEvent(eventData, {
          onSuccess: () => {
            toast.dismiss();
            toast.success("Etkinlik oluşturuldu");
            setTimeout(() => {
              router.push(isAdmin ? "/admin/events" : "/events");
            }, 500);
          },
          onError: (error: any) => {
            toast.dismiss();

            toast.error("Etkinlik oluşturulurken bir hata oluştu");

            if (error.response?.data?.errors) {
              const validationErrors = error.response.data.errors;

              Object.entries(validationErrors).forEach(([field, message]) => {
                toast.error(`${field}: ${message}`);
              });
            }
          },
        });
      }
    } catch (error: any) {
      toast.error("İşlem sırasında bir hata oluştu");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEventTypeChange = (value: EventType) => {
    form.setValue("eventType", value);

    setAllowDayTypeCustomization(value === EventType.HYBRID);

    const currentDays = form.getValues("eventDays");
    if (currentDays && currentDays.length > 0) {
      if (value !== EventType.HYBRID) {
        currentDays.forEach((_, index) => {
          form.setValue(`eventDays.${index}.eventType`, value);
        });
      }

      if (value === EventType.ONLINE) {
        form.clearErrors("eventDays");
      }
    }
  };

  const handleDayEventTypeChange = (index: number, value: EventType) => {
    form.setValue(`eventDays.${index}.eventType`, value);

    if (value === EventType.ONLINE) {
      form.setValue(`eventDays.${index}.endTime`, "");
    }
  };

  const addEventDay = () => {
    const currentDays = form.getValues("eventDays") || [];
    const lastDay = currentDays[currentDays.length - 1];
    const generalEventType = form.getValues("eventType");

    const nextDate = lastDay ? new Date(lastDay.date) : new Date();
    nextDate.setDate(nextDate.getDate() + 1);

    const dayEventType =
      generalEventType !== EventType.HYBRID
        ? generalEventType
        : lastDay?.eventType || generalEventType;

    const newDay = {
      date: nextDate,
      startTime: lastDay?.startTime || "",
      endTime: lastDay?.endTime || "",
      eventType: dayEventType,
      location: lastDay?.location || "",
      onlineUrl: lastDay?.onlineUrl || "",
    };

    form.setValue("eventDays", [...currentDays, newDay]);
  };

  const removeEventDay = (index: number) => {
    const currentDays = form.getValues("eventDays");

    if (currentDays.length <= 1) {
      toast.error("En az bir etkinlik günü olmalıdır.");
      return;
    }

    const updatedDays = currentDays.filter((_, i) => i !== index);
    form.setValue("eventDays", updatedDays);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {isEdit ? "Etkinliği Düzenle" : "Yeni Etkinlik Oluştur"}
            </CardTitle>
            <CardDescription>
              Etkinlik detaylarını doldurun. Organizatör olarak
              kaydedileceksiniz.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Etkinlik Başlığı</FormLabel>
                  <FormControl>
                    <Input placeholder="Örn: React Workshop" {...field} />
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
                  <FormLabel>Etkinlik Açıklaması</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Etkinlik detaylarını yazın"
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Genel Etkinlik Tipi</FormLabel>
                  <Select
                    onValueChange={(value: EventType) => {
                      field.onChange(value);
                      handleEventTypeChange(value);
                    }}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Etkinlik tipi seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={EventType.IN_PERSON}>
                        Fiziksel
                      </SelectItem>
                      <SelectItem value={EventType.ONLINE}>Online</SelectItem>
                      <SelectItem value={EventType.HYBRID}>Hibrit</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {form.watch("eventType") === EventType.HYBRID
                      ? "Hibrit seçildiğinde her gün için farklı tipler belirleyebilirsiniz."
                      : "Etkinliğin genel tipi. Tüm günler bu tipi kullanacaktır."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Etkinlik Günleri</h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addEventDay}
                  className="flex items-center gap-1"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Gün Ekle</span>
                </Button>
              </div>

              {showDatesOrderError && (
                <div className="p-4 mb-4 border border-destructive bg-destructive/10 rounded-md text-destructive">
                  <p className="font-semibold">
                    Etkinlik günleri kronolojik sırada olmalıdır!
                  </p>
                  <p className="text-sm">
                    Lütfen etkinlik günlerinin tarihlerini kontrol edin, bir
                    sonraki gün her zaman önceki günden sonra olmalıdır.
                  </p>
                </div>
              )}

              {form.watch("eventDays")?.map((day, index) => (
                <Card key={index} className="pt-4">
                  <CardHeader className="pb-2 pt-0 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {index + 1}. Gün
                      </CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEventDay(index)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 px-4 pb-4">
                    <FormField
                      control={form.control}
                      name={`eventDays.${index}.date`}
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Tarih</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: tr })
                                  ) : (
                                    <span>Tarih seçin</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                locale={tr}
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date <
                                  new Date(new Date().setHours(0, 0, 0, 0))
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {allowDayTypeCustomization && (
                      <FormField
                        control={form.control}
                        name={`eventDays.${index}.eventType`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gün Tipi</FormLabel>
                            <Select
                              onValueChange={(value: EventType) => {
                                field.onChange(value);
                                handleDayEventTypeChange(index, value);
                              }}
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Gün tipi seçin" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value={EventType.IN_PERSON}>
                                  Fiziksel
                                </SelectItem>
                                <SelectItem value={EventType.ONLINE}>
                                  Online
                                </SelectItem>
                                <SelectItem value={EventType.HYBRID}>
                                  Hibrit
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Bu günün etkinlik tipini seçin
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`eventDays.${index}.startTime`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Başlangıç Saati</FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                placeholder="12:00"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch(`eventDays.${index}.eventType`) !==
                      EventType.ONLINE ? (
                        <FormField
                          control={form.control}
                          name={`eventDays.${index}.endTime`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bitiş Saati</FormLabel>
                              <FormControl>
                                <Input
                                  type="time"
                                  placeholder="18:00"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={form.control}
                          name={`eventDays.${index}.endTime`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bitiş Saati (Opsiyonel)</FormLabel>
                              <FormControl>
                                <Input
                                  type="time"
                                  placeholder="18:00"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    {(form.watch(`eventDays.${index}.eventType`) ===
                      EventType.IN_PERSON ||
                      form.watch(`eventDays.${index}.eventType`) ===
                        EventType.HYBRID) && (
                      <FormField
                        control={form.control}
                        name={`eventDays.${index}.location`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Konum</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Fiziksel etkinlik konumu"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {(form.watch(`eventDays.${index}.eventType`) ===
                      EventType.ONLINE ||
                      form.watch(`eventDays.${index}.eventType`) ===
                        EventType.HYBRID) && (
                      <FormField
                        control={form.control}
                        name={`eventDays.${index}.onlineUrl`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Online Bağlantı</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://meet.google.com/..."
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Online etkinliğin yapılacağı platform bağlantısı
                              (Zoom, Teams, Meet vb.)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
              {form.formState.errors.eventDays?.message && (
                <p className="text-sm font-medium text-destructive mt-2">
                  {form.formState.errors.eventDays?.message}
                </p>
              )}
            </div>

            <div>
              <FormField
                control={form.control}
                name="coverImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etkinlik Görseli (Zorunlu)</FormLabel>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <FormControl>
                          <Input
                            id="coverImage"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={isUploading}
                          />
                        </FormControl>
                      </div>

                      {previewImage && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={handleRemoveImage}
                          disabled={isUploading}
                        >
                          <Trash className="h-4 w-4 mr-1" /> Görseli Kaldır
                        </Button>
                      )}
                    </div>

                    <FormDescription>
                      Etkinlik için 4:3 oranında bir görsel yükleyin (ör:
                      800x600px)
                    </FormDescription>

                    {previewImage && (
                      <div className="flex justify-center mt-3">
                        <div className="relative aspect-[4/3] w-full max-w-[400px] overflow-hidden rounded-md border">
                          <Image
                            src={previewImage}
                            alt="Etkinlik kapak görseli"
                            fill
                            className="object-cover"
                            unoptimized={true}
                          />
                        </div>
                      </div>
                    )}

                    {isUploading && (
                      <div className="text-sm text-muted-foreground animate-pulse">
                        Görsel yükleniyor...
                      </div>
                    )}

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isAdmin && isEdit && (
              <FormField
                control={form.control}
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
                        <SelectItem value={EventStatus.DRAFT}>
                          Taslak
                        </SelectItem>
                        <SelectItem value={EventStatus.PENDING_APPROVAL}>
                          Onay Bekliyor
                        </SelectItem>
                        <SelectItem value={EventStatus.APPROVED}>
                          Onaylandı
                        </SelectItem>
                        <SelectItem value={EventStatus.REJECTED}>
                          Reddedildi
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              İptal
            </Button>
            <Button type="submit" disabled={isSaving || isUploading}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Etkinliği Güncelle" : "Etkinliği Oluştur"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
