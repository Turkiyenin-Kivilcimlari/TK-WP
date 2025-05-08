"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Linkedin, Twitter, Github, Instagram } from "lucide-react";
import api from "@/lib/api";

interface TeamMember {
  _id: string;
  name: string;
  title: string;
  avatar: string;
  description?: string;
  linkedin?: string;
  twitter?: string;
  github?: string;
  instagram?: string;
}

interface TeamGroup {
  key: string;
  name: string;
  members: TeamMember[];
}

export function Teams() {
  const [teams, setTeams] = useState<TeamGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        const response = await api.get("/community-team");
        if (response.data.success) {
          setTeams(response.data.teams);
        } else {
          setError("Ekip üyeleri yüklenirken bir hata oluştu.");
        }
      } catch (error) {
        setError("Ekip üyeleri yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center space-y-3">
                <Skeleton className="w-24 h-24 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 mx-auto" />
                  <Skeleton className="h-3 w-24 mx-auto" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || teams.length === 0) {
    return <p className="text-center text-muted-foreground">Ekip üyeleri yüklenemedi veya henüz eklenmiş üye yok.</p>;
  }

  return (
    <div className="space-y-12">
      {teams.map((team) => (
        <div key={team.key} className="space-y-6">
          <h3 className="text-2xl font-semibold text-center">{team.name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.members.map((member) => (
              <Card key={member._id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <Avatar className="w-24 h-24 border-2 border-primary/10">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback>
                        {member.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{member.name}</h4>
                      <p className="text-sm text-muted-foreground">{member.title}</p>
                    </div>
                    {member.description && (
                      <p className="text-sm text-muted-foreground">{member.description}</p>
                    )}
                    <div className="flex space-x-2">
                      {member.linkedin && (
                        <a 
                          href={member.linkedin} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                      )}
                      {member.twitter && (
                        <a 
                          href={member.twitter} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Twitter className="h-4 w-4" />
                        </a>
                      )}
                      {member.github && (
                        <a 
                          href={member.github} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Github className="h-4 w-4" />
                        </a>
                      )}
                      {member.instagram && (
                        <a 
                          href={member.instagram} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Instagram className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
