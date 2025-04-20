import { useUsers } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

interface UserActionsProps {
  userId: string;
}

export function UserActions({ userId }: UserActionsProps) {
  const { deleteUser, isDeleting } = useUsers();
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = () => {
    if (!userId || typeof userId !== 'string') {
      toast.error('Kullanıcı ID geçersiz.');
      return;
    }
    
    deleteUser(userId);
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          disabled={isDeleting || !userId}
          className="text-red-600 hover:text-red-800 hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Kullanıcıyı silmek istediğinize emin misiniz?</AlertDialogTitle>
          <AlertDialogDescription>
            Bu işlem geri alınamaz. Kullanıcı hesabı ve ilgili tüm veriler kalıcı olarak silinecektir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>İptal</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? 'Siliniyor...' : 'Evet, Sil'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
