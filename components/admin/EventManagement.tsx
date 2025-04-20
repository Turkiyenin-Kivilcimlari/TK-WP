"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Loader2, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { EventStatus } from "@/models/Event";
import {
  useApproveEvent,
  useRejectEvent,
  useDeleteEvent,
} from "@/hooks/useEvents";
import { toast } from "sonner";

interface EventManagementProps {
  eventId: string;
  status: string;
  onActionComplete?: () => void;
}

export function EventManagement({
  eventId,
  status,
  onActionComplete,
}: EventManagementProps) {
  const router = useRouter();
  const { mutate: approveEvent, isPending: isApproving } = useApproveEvent();
  const { mutate: rejectEvent, isPending: isRejecting } = useRejectEvent();
  const { mutate: deleteEvent, isPending: isDeleting } = useDeleteEvent();

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Etkinliği onayla
  const handleApprove = () => {
    approveEvent(eventId, {
      onSuccess: () => {
        if (onActionComplete) onActionComplete();
      },
    });
  };

  // Etkinliği reddet
  const handleReject = () => {
    if (!rejectionReason.trim()) return;

    rejectEvent(
      { eventId, rejectionReason: rejectionReason }, // Changed 'reason' to 'rejectionReason' to match API expectations
      {
        onSuccess: () => {
          setIsRejectDialogOpen(false);
          setRejectionReason("");
          if (onActionComplete) onActionComplete();
        },
        onError: (error) => {
          setRejectionReason(""); // Clear the reason on error as well
          setIsRejectDialogOpen(false); // Close the dialog on error
          toast.error("Etkinlik reddedilemedi", {
            description: "Bir hata oluştu. Lütfen tekrar deneyin.",
          });
        },
      }
    );
  };

  // Etkinliği sil
  const handleDelete = () => {
    deleteEvent(eventId, {
      onSuccess: () => {
        setIsDeleteAlertOpen(false);
        if (onActionComplete) onActionComplete();
      },
    });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {/* Etkinlik durumuna göre butonları göster/gizle */}
      {status !== EventStatus.APPROVED && (
        <Button
          onClick={handleApprove}
          disabled={isApproving}
          variant="default"
          className="flex items-center gap-2"
        >
          {isApproving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          Onayla
        </Button>
      )}

      {status !== EventStatus.REJECTED && (
        <Button
          onClick={() => setIsRejectDialogOpen(true)}
          disabled={isRejecting}
          variant="secondary"
          className="flex items-center gap-2"
        >
          {isRejecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          Reddet
        </Button>
      )}

      <Button
        onClick={() => setIsDeleteAlertOpen(true)}
        disabled={isDeleting}
        variant="destructive"
        className="flex items-center gap-2"
      >
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        Sil
      </Button>

      {/* Reddetme Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Etkinliği Reddet</DialogTitle>
            <DialogDescription>
              Lütfen etkinliği neden reddettiğinize dair bir açıklama yazın. Bu
              açıklama etkinlik sahibine iletilecektir.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Reddedilme nedeni..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="min-h-[120px]"
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={isRejecting}
            >
              İptal
            </Button>
            <Button
              variant="default"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || isRejecting}
            >
              {isRejecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  İşleniyor...
                </>
              ) : (
                "Reddet"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Silme Onay Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Etkinliği Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu etkinliği silmek istediğinize emin misiniz? Bu işlem geri
              alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Siliniyor...
                </>
              ) : (
                "Evet, Sil"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
