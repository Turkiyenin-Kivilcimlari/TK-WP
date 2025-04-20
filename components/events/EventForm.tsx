"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { UserRole } from "@/models/User";
import { EventType, EventStatus } from "@/models/Event";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUploadImage } from "@/hooks/useUploadImage";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useCreateEvent, useUpdateEvent } from "@/hooks/useEvents";
import Image from "next/image";
import { slugify } from "@/lib/utils";

// Event form doğrulama şeması
const eventFormSchema = z.object({
  title: z.string().min(5, 'Başlık en az 5 karakter olmalıdır'),
  description: z.string().min(20, 'Açıklama en az 20 karakter olmalıdır'),
  eventType: z.enum([EventType.IN_PERSON, EventType.ONLINE, EventType.HYBRID]),
  eventDate: z.date({
    required_error: "Etkinlik tarihi seçmelisiniz",
  }),
  location: z.string().optional(),
  onlineUrl: z.string()
    .refine(val => {
      if (!val) return true;
      return val.startsWith('http://') || val.startsWith('https://');
    }, { message: 'Bağlantı http:// veya https:// ile başlamalıdır' })
    .optional(),
  status: z.enum([
    EventStatus.DRAFT,
    EventStatus.PENDING_APPROVAL,
    EventStatus.APPROVED,
    EventStatus.REJECTED
  ]).optional()
}).refine(data => {
  if ((data.eventType === EventType.IN_PERSON || data.eventType === EventType.HYBRID) && !data.location) {
    return false;
  }
  return true;
}, {
  message: "Fiziksel etkinlik için konum gereklidir",
  path: ["location"],
}).refine(data => {
  if ((data.eventType === EventType.ONLINE || data.eventType === EventType.HYBRID) && !data.onlineUrl) {
    return false;
  }
  return true;
}, {
  message: "Online etkinlik için bağlantı adresi gereklidir",
  path: ["onlineUrl"],
}).refine(data => {
  if ((data.eventType === EventType.ONLINE || data.eventType === EventType.HYBRID) && 
      data.onlineUrl && 
      !(data.onlineUrl.startsWith('http://') || data.onlineUrl.startsWith('https://'))) {
    return false;
  }
  return true;
}, {
  message: "Bağlantı http:// veya https:// ile başlamalıdır",
  path: ["onlineUrl"],
});

// Event form props
interface EventFormProps {
  event?: any; // Mevcut etkinlik (düzenleme için)
  isEdit?: boolean;
}

// Event Form Bileşeni
export function EventForm({ event, isEdit = false }: EventFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [previewImage, setPreviewImage] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const { uploadImage } = useUploadImage();
  
  const { mutate: createEvent, isPending: isCreating } = useCreateEvent();
  const { mutate: updateEvent } = useUpdateEvent();

  const defaultValues = {
    title: "",
    description: "",
    eventType: EventType.IN_PERSON,
    eventDate: new Date(),
    location: "",
    onlineUrl: "",
    status: EventStatus.PENDING_APPROVAL
  };

  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: isEdit && event ? {
      title: event.title || "",
      description: event.description || "",
      eventType: event.eventType || EventType.IN_PERSON,
      eventDate: event.eventDate ? new Date(event.eventDate) : new Date(),
      location: event.location || "",
      onlineUrl: event.onlineUrl || "",
      status: event.status || EventStatus.PENDING_APPROVAL
    } : defaultValues
  });

  useEffect(() => {
    if (isEdit && event) {
      form.reset({
        title: event.title || "",
        description: event.description || "",
        eventType: event.eventType || EventType.IN_PERSON,
        eventDate: event.eventDate ? new Date(event.eventDate) : new Date(),
        location: event.location || "",
        onlineUrl: event.onlineUrl || "",
        status: event.status || EventStatus.PENDING_APPROVAL
      });
      
      setPreviewImage(event.coverImage || "");
    }
  }, [isEdit, event, form]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image')) {
      toast.error('Lütfen bir resim dosyası seçin');
      return;
    }

    setIsUploading(true);
    try {
      const data = await uploadImage(file);
      if (data.success && data.url) {
        setPreviewImage(data.url);
        toast.success('Görsel başarıyla yüklendi');
      } else {
        toast.error('Görsel yüklenirken bir hata oluştu');
      }
    } catch (error) {
      toast.error('Görsel yüklenirken bir hata oluştu');
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = (data: z.infer<typeof eventFormSchema>) => {
    if (!previewImage) {
      toast.error("Kapak görseli zorunludur");
      return;
    }

    
    try {
      const slug = slugify(data.title);
      
      const eventData = {
        ...data,
        coverImage: previewImage,
        slug,
        ...((!isAdmin && !isEdit) && { status: EventStatus.PENDING_APPROVAL })
      };


      if (isEdit && event) {
        toast.loading("Etkinlik güncelleniyor...");
        updateEvent(
          { slug: event.slug, eventData },
          {
            onSuccess: () => {
              toast.dismiss();
              toast.success("Etkinlik güncellendi");
              setTimeout(() => {
                router.push(
                  isAdmin ? "/admin/events" : "/events"
                );
              }, 500);
            },
            onError: (error) => {
              toast.dismiss();
              toast.error("Etkinlik güncellenirken bir hata oluştu");
            }
          }
        );
      } else {
        toast.loading("Etkinlik oluşturuluyor...");
        createEvent(
          eventData,
          {
            onSuccess: () => {
              toast.dismiss();
              toast.success("Etkinlik oluşturuldu");
              setTimeout(() => {
                router.push(
                  isAdmin ? "/admin/events" : "/events"
                );
              }, 500);
            },
            onError: (error: Error) => {
              toast.dismiss();
              toast.error("Etkinlik oluşturulurken bir hata oluştu");
            }
          }
        );
      }
    } catch (error) {
      toast.error("İşlem sırasında bir hata oluştu");
    }
  };

  const isAdmin =
    session?.user?.role === UserRole.ADMIN || session?.user?.role === UserRole.SUPERADMIN;

  const handleEventTypeChange = (value: EventType) => {
    form.setValue("eventType", value);
    
    if (value === EventType.IN_PERSON) {
      form.setValue("onlineUrl", "");
    } else if (value === EventType.ONLINE) {
      form.setValue("location", "");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{isEdit ? "Etkinliği Düzenle" : "Yeni Etkinlik Oluştur"}</CardTitle>
            <CardDescription>
              Etkinlik detaylarını doldurun. Organizatör olarak kaydedileceksiniz.
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
                    <Input placeholder="Etkinlik başlığı girin" {...field} />
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
                      placeholder="Etkinlik açıklaması girin"
                      className="resize-none min-h-[120px]"
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
                  <FormLabel>Etkinlik Türü</FormLabel>
                  <Select
                    onValueChange={(value) => handleEventTypeChange(value as EventType)}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Etkinlik türü seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={EventType.IN_PERSON}>Fiziksel Etkinlik</SelectItem>
                      <SelectItem value={EventType.ONLINE}>Online Etkinlik</SelectItem>
                      <SelectItem value={EventType.HYBRID}>Hibrit Etkinlik</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="eventDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Etkinlik Tarihi ve Saati</FormLabel>
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
                            format(field.value, 'PPP HH:mm', { locale: tr })
                          ) : (
                            <span>Tarih ve saat seçin</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          if (date) {
                            const currentDate = field.value || new Date();
                            date.setHours(currentDate.getHours());
                            date.setMinutes(currentDate.getMinutes());
                          }
                          field.onChange(date);
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        locale={tr}
                      />
                      
                      <div className="p-3 border-t">
                        <Label>Saat</Label>
                        <div className="flex gap-2 mt-2 items-center">
                          <Input
                            type="time"
                            value={field.value ? format(field.value, 'HH:mm') : ''}
                            onChange={(e) => {
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              const newDate = new Date(field.value || new Date());
                              newDate.setHours(hours);
                              newDate.setMinutes(minutes);
                              field.onChange(newDate);
                            }}
                          />
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(form.watch("eventType") === EventType.IN_PERSON || form.watch("eventType") === EventType.HYBRID) && (
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etkinlik Yeri</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Örn: Acme Plaza, Konferans Salonu" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Fiziksel etkinliğin gerçekleşeceği tam adresi yazın
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(form.watch("eventType") === EventType.ONLINE || form.watch("eventType") === EventType.HYBRID) && (
              <FormField
                control={form.control}
                name="onlineUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Online Bağlantı</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://meet.google.com/xxx veya https://zoom.us/j/xxx" 
                        {...field}
                        onChange={(e) => {
                          let value = e.target.value;
                          if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                            value = 'https://' + value;
                          }
                          field.onChange(value);
                        }} 
                      />
                    </FormControl>
                    <FormDescription>
                      Zoom, Google Meet, Microsoft Teams vb. bağlantı adresini girin.
                      Otomatik olarak https:// eklenecektir.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="space-y-2">
              <Label htmlFor="coverImage" className="flex items-center">
                Kapak Görseli
                <span className="text-red-500 ml-1">*</span>
              </Label>
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
                  {previewImage ? "Görseli Değiştir" : "Görsel Yükle"} 
                </Button>
                <input
                  id="coverImage"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
              </div>
              <FormDescription>
                Etkinlik için 4:3 oranında bir görsel yükleyin (ör: 800x600px)
              </FormDescription>

              {previewImage && (
                <div className="flex justify-center mt-3">
                  <div className="relative aspect-[4/3] w-full max-w-[400px] overflow-hidden rounded-md border">
                    <Image
                      src={previewImage}
                      alt="Etkinlik kapak görseli"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              )}

              {isUploading && (
                <div className="text-sm text-muted-foreground animate-pulse">
                  Görsel yükleniyor...
                </div>
              )}
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
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Durum seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={EventStatus.PENDING_APPROVAL}>Onay Bekliyor</SelectItem>
                        <SelectItem value={EventStatus.APPROVED}>Onaylanmış</SelectItem>
                        <SelectItem value={EventStatus.REJECTED}>Reddedilmiş</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              İptal
            </Button>
            <Button
              type="submit"
              onClick={() => {
                
                if (!previewImage) {
                  toast.error("Kapak görseli zorunludur");
                  return;
                }
                
                if ((form.watch("eventType") === EventType.ONLINE || form.watch("eventType") === EventType.HYBRID) && 
                    form.formState.errors.onlineUrl) {
                  const onlineUrl = form.getValues().onlineUrl || "";
                  
                  if (onlineUrl && !onlineUrl.startsWith('http://') && !onlineUrl.startsWith('https://')) {
                    const fixedUrl = 'https://' + onlineUrl;
                    form.setValue('onlineUrl', fixedUrl, { shouldValidate: true });
                  }
                }
              }}
              disabled={isUploading}
              className="relative"
            >
              {(isCreating) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEdit ? "Güncelle" : "Oluştur"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
