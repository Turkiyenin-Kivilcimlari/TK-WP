"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";

interface TeamMember {
  _id: string;
  name: string;
  title: string;
  description?: string;
  image: string;
}

interface CategoryInfo {
  id: string;
  name: string;
}

export function TeamSection() {
  const [loading, setLoading] = useState(true);
  const [teamsByCategory, setTeamsByCategory] = useState<Record<string, TeamMember[]>>({});
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get("/api/community-team");
        
        if (response.data && response.data.success) {
          setTeamsByCategory(response.data.teams);
          setCategories(response.data.categories);
          
          // İlk kategoriyi aktif tab olarak ayarla (eğer varsa ve henüz seçilmemişse)
          if (response.data.categories && response.data.categories.length > 0 && !activeTab) {
            setActiveTab(response.data.categories[0].id);
          }
        } else {
          throw new Error("Ekip verileri alınamadı");
        }
      } catch (error) {
        console.error("Ekip verileri yüklenirken hata:", error);
        setError("Ekip verileri yüklenemedi. Lütfen daha sonra tekrar deneyin.");
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center my-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center my-12 text-muted-foreground">
        <p>{error}</p>
      </div>
    );
  }

  // Kategorilere göre içerik var mı kontrol et
  const hasContent = categories.length > 0 && 
    categories.some(category => 
      teamsByCategory[category.id] && teamsByCategory[category.id].length > 0
    );

  if (!hasContent) {
    return null; // İçerik yoksa hiçbir şey gösterme
  }

  return (
    <section className="py-12 px-4" id="teams">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">Topluluk Ekiplerimiz</h2>
        
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-center mb-6">
            <TabsList className="flex flex-wrap">
              {categories.map((category) => (
                <TabsTrigger 
                  key={category.id} 
                  value={category.id}
                  className="text-sm md:text-base"
                  disabled={!teamsByCategory[category.id] || teamsByCategory[category.id].length === 0}
                >
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          
          {categories.map((category) => (
            <TabsContent key={category.id} value={category.id}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {teamsByCategory[category.id]?.map((member) => (
                  <Card key={member._id} className="overflow-hidden">
                    <CardContent className="p-6 text-center">
                      <Avatar className="h-24 w-24 mx-auto mb-4">
                        <AvatarImage src={member.image} alt={member.name} />
                        <AvatarFallback className="text-lg">
                          {member.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <h3 className="font-bold text-lg">{member.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{member.title}</p>
                      
                      {member.description && (
                        <p className="text-sm text-muted-foreground mt-2">{member.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
