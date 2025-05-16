"use client";

import { useState } from "react";
import useAdminApplications from "@/hooks/useAdminApplications";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, CheckCircle, XCircle, User, Mail, Phone, Calendar } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { UserRole } from "@/models/User";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminApplicationsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { applications, isLoading, updateApplicationStatus, isUpdating } = useAdminApplications();
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'draft' | 'deleted'>('pending');
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("all");
  
  // Handler for status change
  const handleStatusChange = (value: string) => {
    setStatus(value as 'pending' | 'approved' | 'rejected' | 'draft' | 'deleted');
  };

  // Loading state
  if (sessionStatus === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Authentication check
  if (sessionStatus === "unauthenticated") {
    redirect("/signin");
    return null;
  }

  // Admin role check
  const userRole = session?.user?.role;
  if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPERADMIN) {
    redirect("/");
    return null;
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    approved: "bg-green-100 text-green-800 border-green-300",
    rejected: "bg-red-100 text-red-800 border-red-300",
    deleted: "bg-gray-100 text-gray-800 border-gray-300",
    draft: "bg-blue-50 text-blue-800 border-blue-200", // Adding draft status color
  };

  const handleUpdateStatus = () => {
    if (selectedApplication && status) {
      // Make sure we're sending the right status format
      updateApplicationStatus({
        id: selectedApplication._id,
        status: status, // Ensure this is the correct format expected by the API
        adminNotes,
      });

      // Close the dialog after updating
      setSelectedApplication(null);
    }
  };

  const openApplicationDetails = (application: any) => {
    setSelectedApplication(application);
    setStatus(application.status);
    setAdminNotes(application.adminNotes || "");
  };

  // Filter applications based on active tab
  const filteredApplications = applications.filter((app: any) => {
    if (activeTab === "all") return true;
    return app.status === activeTab;
  });

  // Count applications by status
  const pendingCount = applications.filter((app: any) => app.status === "pending").length;
  const approvedCount = applications.filter((app: any) => app.status === "approved").length;
  const rejectedCount = applications.filter((app: any) => app.status === "rejected").length;

  return (
    <div className="container py-6 md:py-10 px-4 md:px-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Topluluk Başvuruları</h1>
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> <span className="sm:inline">Yönetim Paneline Dön</span>
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Başvurular</CardTitle>
          <CardDescription>
            Topluluğa katılmak için yapılan tüm başvuruları burada yönetebilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs 
            defaultValue="all" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-2">
              <TabsTrigger value="all">
                Tümü ({applications.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Bekleyenler ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Onaylı ({approvedCount})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Red ({rejectedCount})
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              {isLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredApplications.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Henüz hiç başvuru yok.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  {/* Mobil görünümde kart tabanlı liste */}
                  <div className="md:hidden space-y-3">
                    {/* Mobil görünüm için başlık ve sayı bilgisi */}
                    <div className="flex justify-between items-center px-2 pb-2 border-b">
                      <h3 className="text-sm font-medium">{activeTab === "all" 
                        ? "Tüm Başvurular" 
                        : activeTab === "pending" 
                          ? "Bekleyen Başvurular" 
                          : activeTab === "approved" 
                            ? "Onaylanan Başvurular" 
                            : "Reddedilen Başvurular"}</h3>
                      <span className="text-xs text-muted-foreground">
                        {filteredApplications.length} başvuru
                      </span>
                    </div>
                    
                    {filteredApplications.map((application: any) => (
                      <div key={application._id} className="bg-card border rounded-lg p-3 shadow-sm">
                        <div className="flex flex-col space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                              <div className="font-medium text-base">
                                {application.user?.name || '-'} {application.user?.lastname || ''}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDistanceToNow(new Date(application.createdAt), {
                                  addSuffix: true,
                                  locale: tr,
                                })}
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={`whitespace-nowrap ml-2 ${
                                application.isDraft 
                                  ? statusColors.draft 
                                  : statusColors[application.status]
                              }`}
                            >
                              {application.isDraft 
                                ? "Taslak" 
                                : application.status === "pending" && "Beklemede"
                                || application.status === "approved" && "Onaylandı"
                                || application.status === "rejected" && "Reddedildi"
                                || application.status === "deleted" && "Silinmiş"
                              }
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm mt-1">
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-muted-foreground">Okul</span>
                              <span className="line-clamp-1 text-sm">{application.schoolName}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-muted-foreground">Bölüm</span>
                              <span className="line-clamp-1 text-sm">{application.department}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-1 text-xs pt-2 border-t border-border/50 mt-1">
                            <div className="flex items-center gap-1 mt-1">
                              <Mail className="h-3 w-3 text-muted-foreground" /> 
                              <span className="line-clamp-1">{application.emailAddress}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" /> 
                              {application.contactInfo}
                            </div>
                          </div>
                          
                          {application.isDraft && (
                            <div className="mt-1 text-xs rounded-md bg-amber-50 text-amber-700 px-2 py-1 border border-amber-200 flex items-center">
                              <span className="text-amber-600 mr-1">⚠️</span> 
                              Kullanıcı tarafından taslak olarak kaydedildi
                            </div>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-1"
                            onClick={() => openApplicationDetails(application)}
                          >
                            <span className="flex items-center">Detayları Görüntüle</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Masaüstü görünümde tablo */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Başvuran</TableHead>
                          <TableHead>Okul/Bölüm</TableHead>
                          <TableHead>İletişim</TableHead>
                          <TableHead>Tarih</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead className="text-right">İşlem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredApplications.map((application: any) => (
                          <TableRow key={application._id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {application.user?.name || '-'} {application.user?.lastname || ''}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div><strong>Okul:</strong> {application.schoolName}</div>
                                <div><strong>Bölüm:</strong> {application.department}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1 text-xs">
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" /> 
                                  {application.emailAddress}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" /> 
                                  {application.contactInfo}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatDistanceToNow(new Date(application.createdAt), {
                                addSuffix: true,
                                locale: tr,
                              })}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  application.isDraft 
                                    ? statusColors.draft 
                                    : statusColors[application.status]
                                }
                              >
                                {application.isDraft 
                                  ? "Taslak" 
                                  : application.status === "pending" && "Beklemede"
                                  || application.status === "approved" && "Onaylandı"
                                  || application.status === "rejected" && "Reddedildi"
                                  || application.status === "deleted" && "Silinmiş"
                                }
                              </Badge>
                              {application.isDraft && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Kullanıcı henüz tamamlamadı
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openApplicationDetails(application)}
                              >
                                Detaylar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Başvuru Detay ve Durum Güncelleme Dialog'u */}
      <Dialog
        open={!!selectedApplication}
        onOpenChange={(open) => {
          if (!open) setSelectedApplication(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] max-w-md sm:max-w-3xl md:max-w-4xl p-0 sm:p-6">
          <div className="sticky top-0 right-0 z-110 flex justify-end">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute rounded-full h-6 w-6 top-2 right-2 sm:top-4 sm:right-4"
              onClick={() => setSelectedApplication(null)}
            >
              <XCircle className="h-4 w-4" />
              <span className="sr-only">Kapat</span>
            </Button>
          </div>
          
          <DialogHeader className="px-4 pt-4 sm:px-0 sm:pt-0 mb-2 sm:mb-4 pr-8">
            <DialogTitle className="text-lg sm:text-xl">Başvuru Detayları</DialogTitle>
            <DialogDescription>
              Başvuru bilgilerini inceleyip durumu güncelleyebilirsiniz.
              {selectedApplication?.updatedAt && selectedApplication?.updatedAt !== selectedApplication?.createdAt && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Son güncelleme: {new Date(selectedApplication?.updatedAt).toLocaleString('tr-TR')}
                  {selectedApplication?.updatedBy === "user" && " (Kullanıcı tarafından düzenlendi)"}
                </p>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-4 sm:space-y-6 px-4 sm:px-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-muted/30 p-3 sm:p-4 rounded-lg">
                  <h3 className="text-sm font-medium mb-2 sm:mb-3 text-primary">Başvuran</h3>
                  <div className="flex flex-col space-y-2">
                    <p className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {selectedApplication.user?.name || '-'} {selectedApplication.user?.lastname || ''}
                      </span>
                    </p>
                    <p className="flex items-center gap-2 text-sm">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span className="break-all">{selectedApplication.emailAddress}</span>
                    </p>
                    <p className="flex items-center gap-2 text-sm">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span>{selectedApplication.contactInfo}</span>
                    </p>
                    <p className="text-xs text-muted-foreground pt-1">
                      Başvuru tarihi: {new Date(selectedApplication.createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
                
                <div className="bg-muted/30 p-3 sm:p-4 rounded-lg">
                  <h3 className="text-sm font-medium mb-2 sm:mb-3 text-primary">Eğitim Bilgileri</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block">Okul</span>
                      <p>{selectedApplication.schoolName}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Bölüm</span>
                      <p>{selectedApplication.department}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Sınıf</span>
                      <p>{selectedApplication.grade}. Sınıf</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Sosyal Medya Bilgileri</h3>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Platformlar</span>
                    <p>{selectedApplication.socialMedia?.join(', ') || 'Belirtilmemiş'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">LinkedIn</span>
                    <p className="break-all">{selectedApplication.linkedinUrl || 'Belirtilmemiş'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Deneyim ve Bilgiler</h3>
                <div className="space-y-4">
                  <div className="bg-muted/20 p-3 rounded-md">
                    <span className="text-xs text-muted-foreground block mb-1">Ek Bilgiler</span>
                    <p className="whitespace-pre-wrap text-sm">{selectedApplication.additionalInfo || 'Belirtilmemiş'}</p>
                  </div>
                  <div className="bg-muted/20 p-3 rounded-md">
                    <span className="text-xs text-muted-foreground block mb-1">Topluluk Deneyimleri</span>
                    <p className="whitespace-pre-wrap text-sm">{selectedApplication.experience || 'Belirtilmemiş'}</p>
                  </div>
                  <div className="bg-muted/20 p-3 rounded-md">
                    <span className="text-xs text-muted-foreground block mb-1">Yetenekler ve Beceriler</span>
                    <p className="whitespace-pre-wrap text-sm">{selectedApplication.skillsOrResources || 'Belirtilmemiş'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Topluluk Vizyonu</h3>
                <div className="space-y-4">
                  <div className="bg-muted/20 p-3 rounded-md">
                    <span className="text-xs text-muted-foreground block mb-1">Topluluktan Beklentiler</span>
                    <p className="whitespace-pre-wrap text-sm">{selectedApplication.communityVision}</p>
                  </div>
                  <div className="bg-muted/20 p-3 rounded-md">
                    <span className="text-xs text-muted-foreground block mb-1">Topluluk Hedefleri</span>
                    <p className="whitespace-pre-wrap text-sm">{selectedApplication.communityExpectation}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-2">Durum</h3>
                <Select value={status} onValueChange={(value) => handleStatusChange(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Başvuru durumunu seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Beklemede</SelectItem>
                    <SelectItem value="approved">Onaylandı</SelectItem>
                    <SelectItem value="rejected">Reddedildi</SelectItem>
                    {status === "deleted" && <SelectItem value="deleted">Silinmiş</SelectItem>}
                    {status === "draft" && <SelectItem value="draft">Taslak</SelectItem>}
                  </SelectContent>
                </Select>
                {selectedApplication?.isDraft && (
                  <p className="text-sm text-amber-600 mt-2 bg-amber-50 p-2 rounded-md">
                    Bu başvuru kullanıcı tarafından taslak olarak kaydedilmiş ve henüz tamamlanmamıştır.
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Admin Notları</h3>
                <Textarea
                  placeholder="Başvuru ile ilgili notlar (adaya gönderilmez)"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0 sm:space-x-2 p-4 sm:p-6 border-t mt-4">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto order-3 sm:order-1"
              onClick={() => setSelectedApplication(null)}
            >
              İptal
            </Button>

            <Button 
              variant="destructive" 
              className="w-full sm:w-auto order-2"
              onClick={() => {
                setStatus('rejected'); // Set the status directly
                setTimeout(() => handleUpdateStatus(), 100); // Call update after state is set
              }} 
              disabled={isUpdating}
            >
              {isUpdating && status === 'rejected' ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reddediliyor</>
              ) : (
                <><XCircle className="mr-2 h-4 w-4" /> Reddet</>
              )}
            </Button>

            <Button 
              variant="default" 
              className="w-full sm:w-auto order-1 sm:order-3"
              onClick={() => {
                setStatus('approved'); // Set the status directly
                setTimeout(() => handleUpdateStatus(), 100); // Call update after state is set
              }}
              disabled={isUpdating}
            >
              {isUpdating && status === 'approved' ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Onaylanıyor</>
              ) : (
                <><CheckCircle className="mr-2 h-4 w-4" /> Onayla</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
