"use client";

import { useState } from 'react';
import { useUser, UpdateUserData } from '@/hooks/useUser';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function UserProfile() {
  const { data: session } = useSession();
  const userId = session?.user?.email as string;
  
  const { user, isLoading, updateUser, isUpdating } = useUser(userId);
  
  const [formData, setFormData] = useState<UpdateUserData>({
    name: '',
    lastname: '',
    phone: '',
  });
  
  // Form verilerini kullanıcı bilgileriyle doldur
  useState(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        lastname: user.lastname || '',
        phone: user.phone || '',
      });
    }
  });
  
  // Form değişikliklerini işle
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  // Form gönderimi
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser(formData);
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle><Skeleton className="h-8 w-1/2" /></CardTitle>
          <CardDescription><Skeleton className="h-4 w-3/4" /></CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil Bilgileri</CardTitle>
        <CardDescription>Kişisel bilgilerinizi güncelleyin</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Ad</Label>
              <Input 
                id="name" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastname">Soyad</Label>
              <Input 
                id="lastname" 
                name="lastname" 
                value={formData.lastname} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon Numarası</Label>
            <Input 
              id="phone" 
              name="phone" 
              value={formData.phone} 
              onChange={handleChange} 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">E-posta (değiştirilemez)</Label>
            <Input 
              id="email" 
              value={user?.email} 
              disabled 
            />
          </div>
        </CardContent>
        
        <CardFooter>
          <Button 
            type="submit" 
            disabled={isUpdating}
          >
            {isUpdating ? 'Güncelleniyor...' : 'Bilgileri Güncelle'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
