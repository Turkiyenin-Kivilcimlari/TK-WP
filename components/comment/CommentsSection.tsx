import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { tr } from 'date-fns/locale';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageCircle,
  Trash2,
  Loader2,
  Reply,
  ThumbsUp,
  MoreHorizontal
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/lib/api';
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
import { LikeButton } from "@/components/button/LikeButton";

interface CommentAuthor {
  id: string;
  name: string;
  lastname: string;
  avatar?: string;
}

interface Comment {
  id: string;
  content: string;
  author: CommentAuthor;
  parent: string | null;
  createdAt: string;
  replies?: Comment[];
}

interface CommentsSectionProps {
  articleId: string;
  isAdmin?: boolean;
}

export function CommentsSection({ articleId, isAdmin = false }: CommentsSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const router = useRouter();

  // Yorumları getir
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/api/articles/${articleId}/comments`);
        setComments(response.data.comments || []);
      } catch (error) {
        toast.error("Yorumlar yüklenemedi");
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
  }, [articleId]);

  // Yeni yorum gönder
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      toast.error("Yorum yapabilmek için giriş yapmalısınız");
      router.push(`/signin?callbackUrl=${encodeURIComponent(window.location.href)}`);
      return;
    }
    
    if (!newComment.trim()) {
      toast.error("Yorum içeriği boş olamaz");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Sadece içeriği gönder, yazar bilgisini gönderme
      const response = await api.post(`/api/articles/${articleId}/comments`, {
        content: newComment
        // author bilgisini kaldırdık
      });
      
      // Yeni yorumu listeye ekle
      setComments(prev => [response.data.comment, ...prev]);
      
      // Formu temizle
      setNewComment("");
      
      toast.success("Yorumunuz eklendi");
    } catch (error) {
      toast.error("Yorumunuz eklenemedi");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Alt yorum gönder
  const handleSubmitReply = async (parentId: string) => {
    if (!session) {
      toast.error("Yanıt vermek için giriş yapmalısınız");
      router.push(`/signin?callbackUrl=${encodeURIComponent(window.location.href)}`);
      return;
    }
    
    if (!replyContent.trim()) {
      toast.error("Yanıt içeriği boş olamaz");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await api.post(`/api/articles/${articleId}/comments`, {
        content: replyContent,
        parent: parentId  // 'parentId' yerine 'parent' alanını kullanıyoruz
      });
      
      // Ana yorumları güncelle - yanıtı ilgili yoruma ekle
      setComments(prev => prev.map(comment => {
        if (comment.id === parentId) {
          const replies = comment.replies || [];
          return {
            ...comment,
            replies: [...replies, response.data.comment]
          };
        }
        return comment;
      }));
      
      // Formu temizle ve yanıt modunu kapat
      setReplyContent("");
      setReplyingTo(null);
      
      toast.success("Yanıtınız eklendi");
    } catch (error) {
      toast.error("Yanıtınız eklenemedi");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Yorum silme işlemi
  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.delete(`/api/articles/${articleId}/comments/${commentId}`);
      
      // Ana yorumlar arasında mı kontrol et
      const isMainComment = comments.some(c => c.id === commentId);
      
      if (isMainComment) {
        // Ana yorumu ve tüm yanıtlarını kaldır
        setComments(prev => prev.filter(comment => comment.id !== commentId));
      } else {
        // Alt yorumu kaldır
        setComments(prev => prev.map(comment => {
          if (comment.replies?.some(reply => reply.id === commentId)) {
            return {
              ...comment,
              replies: comment.replies.filter(reply => reply.id !== commentId)
            };
          }
          return comment;
        }));
      }
      
      toast.success("Yorum silindi");
    } catch (error) {
      toast.error("Yorum silinemedi");
    } finally {
      setCommentToDelete(null);
    }
  };

  // Kullanıcının yorumu silme yetkisi var mı
  const canDeleteComment = (comment: Comment) => {
    if (!session) return false;
    
    // Kullanıcı kendi yorumunu silebilir veya admin tüm yorumları silebilir
    return session.user.id === comment.author.id || isAdmin;
  };

  return (
    <div className="mt-12">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageCircle className="mr-2 h-5 w-5" />
            Yorumlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Yorum formu - sadece giriş yapmış kullanıcılara gösterilir */}
          {session ? (
            <form onSubmit={handleSubmitComment} className="mb-6">
              <Textarea
                placeholder="Yorumunuzu yazın..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="mb-3 min-h-[100px]"
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : (
                    "Yorum Ekle"
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="bg-muted p-4 rounded-lg mb-6 text-center">
              <p className="text-muted-foreground mb-2">Yorum yapabilmek için giriş yapmalısınız</p>
              <Button asChild>
                <a href={`/signin?callbackUrl=${encodeURIComponent(window.location.href)}`}>
                  Giriş Yap
                </a>
              </Button>
            </div>
          )}

          <Separator className="my-4" />

          {/* Yorumlar listesi */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} className="border rounded-lg p-4 md:p-3">
                  <div className="flex items-start space-x-3 md:space-x-4">
                    <Avatar className="h-8 w-8 md:h-10 md:w-10">
                      <AvatarImage src={comment.author?.avatar || ""} alt={`${comment.author?.name} ${comment.author?.lastname}`} />
                      <AvatarFallback className="text-xs md:text-base">
                        {comment.author?.name?.[0]}{comment.author?.lastname?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm md:text-base">
                            {comment.author?.name} {comment.author?.lastname}
                          </p>
                          <div className="text-xs md:text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: tr })}
                          </div>
                        </div>
                        
                        {/* Yorum aksiyon butonları */}
                        <div className="flex items-start space-x-2">
                          {/* Mobil için ayrı düzen */}
                          <div className="block md:hidden">
                            <div className="flex flex-col items-end space-y-1">
                              {/* Beğeni butonu */}
                              {comment.id && (
                                <LikeButton
                                  targetId={comment.id}
                                  targetType="comment"
                                  size="sm"
                                  variant="ghost"
                                  className="w-auto scale-90 md:scale-100"
                                  key={`like-${comment.id}`}
                                  data-like-target={comment.id}
                                />
                              )}
                              
                              <div className="flex space-x-1">
                                {/* Silme butonu */}
                                {canDeleteComment(comment) && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => setCommentToDelete(comment.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                
                                {/* Yanıt butonu */}
                                {session && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7"
                                    onClick={() => {
                                      setReplyingTo(replyingTo === comment.id ? null : comment.id);
                                      setReplyContent("");
                                    }}
                                  >
                                    <Reply className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Masaüstü için ayrı butonlar */}
                          <div className="hidden md:flex md:items-center md:space-x-2">
                            {/* Beğeni butonu */}
                            <div>
                              {comment.id && (
                                <LikeButton
                                  targetId={comment.id}
                                  targetType="comment"
                                  size="icon"
                                  variant="ghost"
                                  className={`h-7 like-button-${comment.id}`}
                                  key={`like-${comment.id}`}
                                  data-like-target={comment.id}
                                />
                              )}
                            </div>
                            
                            {/* Silme butonu */}
                            {canDeleteComment(comment) && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setCommentToDelete(comment.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            
                            {/* Yanıt verme butonu */}
                            {session && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7"
                                onClick={() => {
                                  setReplyingTo(replyingTo === comment.id ? null : comment.id);
                                  setReplyContent("");
                                }}
                              >
                                <Reply className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2 md:mt-3 text-xs md:text-sm">
                        {comment.content}
                      </div>
                      
                      {/* Yanıt formu */}
                      {replyingTo === comment.id && session && (
                        <div className="mt-4">
                          <Textarea
                            placeholder="Yanıtınızı yazın..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            className="mb-2 min-h-[80px] text-sm"
                          />
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setReplyingTo(null)}
                            >
                              İptal
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleSubmitReply(comment.id)}
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  Gönderiliyor...
                                </>
                              ) : (
                                "Yanıtla"
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Alt yorumlar */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 md:mt-4 pl-2 md:pl-4 border-l-2 border-muted space-y-3 md:space-y-4">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex items-start space-x-2 md:space-x-3">
                              <Avatar className="h-6 w-6 md:h-8 md:w-8">
                                <AvatarImage src={reply.author?.avatar || ""} alt={`${reply.author?.name} ${reply.author?.lastname}`} />
                                <AvatarFallback className="text-[10px] md:text-xs">
                                  {reply.author?.name?.[0]}{reply.author?.lastname?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-semibold text-xs md:text-sm">
                                      {reply.author?.name} {reply.author?.lastname}
                                    </p>
                                    <div className="text-[10px] md:text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: tr })}
                                    </div>
                                  </div>
                                  
                                  {/* Yanıt aksiyon butonları */}
                                  <div className="flex items-start space-x-2">
                                    {/* Mobil için ayrı düzen */}
                                    <div className="block md:hidden">
                                      <div className="flex flex-col items-end space-y-1">
                                        {/* Beğeni butonu */}
                                        {reply.id && (
                                          <LikeButton
                                            targetId={reply.id}
                                            targetType="comment"
                                            size="sm"
                                            variant="ghost"
                                            className="w-auto scale-80 md:scale-100"
                                            key={`like-${reply.id}`}
                                            data-like-target={reply.id}
                                          />
                                        )}
                                        
                                        {/* Silme butonu */}
                                        {canDeleteComment(reply) && (
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => setCommentToDelete(reply.id)}
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Masaüstü için ayrı butonlar */}
                                    <div className="hidden md:flex md:items-center md:space-x-2">
                                      {/* Beğeni butonu */}
                                      <div>
                                        {reply.id && (
                                          <LikeButton
                                            targetId={reply.id}
                                            targetType="comment"
                                            size="icon"
                                            variant="ghost"
                                            className={`h-6 like-button-${reply.id}`}
                                            key={`like-${reply.id}`}
                                            data-like-target={reply.id}
                                          />
                                        )}
                                      </div>
                                      
                                      {/* Silme butonu */}
                                      {canDeleteComment(reply) && (
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                          onClick={() => setCommentToDelete(reply.id)}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="mt-1 text-xs md:text-sm">
                                  {reply.content}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Henüz yorum yapılmamış. İlk yorumu siz yapın!</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Yorum silme için AlertDialog - Tüm yorumlar için ortak kullanılır */}
      <AlertDialog open={!!commentToDelete} onOpenChange={(open) => !open && setCommentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Yorumu sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu yorumu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCommentToDelete(null)}>İptal</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (commentToDelete) {
                  handleDeleteComment(commentToDelete);
                }
              }}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

