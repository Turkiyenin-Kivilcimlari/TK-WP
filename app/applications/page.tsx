"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileEdit, Trash2, PlusCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import api from "@/lib/api";
import Link from "next/link";

export default function MyApplicationsPage() {
  const { data: session, status } = useSession();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      fetchApplications();
    }
  }, [status]);

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(
        "/api/applications?userId=" + session?.user?.id
      );
      setApplications(response.data?.applications || []);
    } catch (error) {
      toast.error("Başvurularınız yüklenirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setIsDeleting(true);
      await api.delete(`/api/applications/${deleteId}`);
      toast.success("Başvuru başarıyla silindi.");
      setApplications(applications.filter((app: any) => app._id !== deleteId));
    } catch (error) {
      toast.error("Başvuru silinirken bir hata oluştu.");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    approved: "bg-green-100 text-green-800 border-green-300",
    rejected: "bg-red-100 text-red-800 border-red-300",
    draft: "bg-blue-50 text-blue-800 border-blue-200",
  };

  const statusText: Record<string, string> = {
    pending: "Beklemede",
    approved: "Onaylandı",
    rejected: "Reddedildi",
    draft: "Taslak",
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <p className="mb-4 text-lg">
          Başvurularınızı görmek için giriş yapmalısınız.
        </p>
        <Button asChild>
          <Link href="/signin?callbackUrl=/applications">Giriş Yap</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-6 px-4 sm:py-10 sm:px-6 max-w-full sm:max-w-5xl mx-auto">
      <Card className="shadow-sm">
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className="text-xl sm:text-2xl">Başvurularım</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Topluluk için yaptığınız başvuruları görüntüleyin, düzenleyin veya
            silin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-8 sm:py-10">
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                Henüz bir başvuru yapmamışsınız.
              </p>
              <Button asChild className="text-sm sm:text-base py-5 sm:py-6">
                <Link href="/apply" className="flex items-center gap-2">
                  <PlusCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Başvuru
                  Yap
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              {/* Mobile view (cards instead of table) */}
              <div className="md:hidden space-y-4">
                {applications.map((application: any) => (
                  <div
                    key={application._id}
                    className="bg-background rounded-lg border p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-medium text-sm">
                          {application.schoolName}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {application.department}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={statusColors[application.status]}
                      >
                        <span className="text-[10px]">
                          {statusText[application.status]}
                        </span>
                      </Badge>
                    </div>

                    <div className="text-xs space-y-1 mb-3">
                      <p className="text-muted-foreground">
                        {formatDistanceToNow(new Date(application.createdAt), {
                          addSuffix: true,
                          locale: tr,
                        })}
                      </p>
                      <p>{application.contactInfo}</p>
                      <p className="text-muted-foreground">
                        {application.emailAddress}
                      </p>
                    </div>

                    <div className="flex justify-end gap-2">
                      {(application.status === "pending" ||
                        application.status === "draft") && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="text-[10px] py-1 h-7 px-2"
                          >
                            <Link
                              href={`/applications/edit/${application._id}`}
                            >
                              <FileEdit className="h-3 w-3 mr-1" /> Düzenle
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteId(application._id)}
                            className="text-red-600 hover:text-red-700 text-[10px] py-1 h-7 px-2"
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Sil
                          </Button>
                        </>
                      )}
                      {(application.status === "approved" ||
                        application.status === "rejected") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteId(application._id)}
                          className="text-red-600 hover:text-red-700 text-[10px] py-1 h-7 px-2"
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Sil
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop view (table) */}
              <div className="hidden md:block">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-sm">Tarih</TableHead>
                      <TableHead className="text-sm">Okul/Bölüm</TableHead>
                      <TableHead className="text-sm">İletişim</TableHead>
                      <TableHead className="text-sm">Durum</TableHead>
                      <TableHead className="text-sm text-right">
                        İşlemler
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((application: any) => (
                      <TableRow key={application._id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDistanceToNow(
                            new Date(application.createdAt),
                            {
                              addSuffix: true,
                              locale: tr,
                            }
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>
                            <div className="font-medium">
                              {application.schoolName}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {application.department}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {application.contactInfo}
                          <br />
                          <span className="text-xs text-muted-foreground">
                            {application.emailAddress}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusColors[application.status]}
                          >
                            <span className="text-xs">
                              {statusText[application.status]}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {(application.status === "pending" ||
                            application.status === "draft") && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="mr-2 text-xs py-1 h-7"
                              >
                                <Link
                                  href={`/applications/edit/${application._id}`}
                                >
                                  <FileEdit className="h-3.5 w-3.5 mr-1" />{" "}
                                  Düzenle
                                </Link>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteId(application._id)}
                                className="text-red-600 hover:text-red-700 text-xs py-1 h-7"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Sil
                              </Button>
                            </>
                          )}
                          {(application.status === "approved" ||
                            application.status === "rejected") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteId(application._id)}
                              className="text-red-600 hover:text-red-700 text-xs py-1 h-7"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Sil
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between flex-wrap gap-2 flex-col sm:flex-row border-t pt-4">
          <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1 text-center sm:text-left">
            Toplam {applications.length} başvuru
          </p>
          <Button
            asChild
            className="w-full sm:w-auto order-1 sm:order-2 text-sm py-5 sm:py-2"
          >
            <Link href="/apply" className="flex items-center gap-2">
              <PlusCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Yeni Başvuru
              Yap
            </Link>
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent className="max-w-[90%] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">
              Başvuruyu silmek istediğinizden emin misiniz?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Bu işlem geri alınamaz. Başvurunuz sistemden tamamen silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 flex-col sm:flex-row">
            <AlertDialogCancel
              disabled={isDeleting}
              className="mt-2 sm:mt-0 text-sm py-5 sm:py-2"
            >
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white text-sm py-5 sm:py-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                  Siliniyor...
                </>
              ) : (
                <>Başvuruyu Sil</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
