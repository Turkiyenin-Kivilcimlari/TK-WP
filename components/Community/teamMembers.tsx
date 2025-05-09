"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamMemberCard } from "./team-member-card";

interface TeamMember {
  id?: string;
  _id?: string;
  name: string; 
  lastname: string;
  email?: string;
  role: string;
  avatar?: string;
  photo?: string; 
  title?: string;
  university?: string;
  universityLogo?: string;
  about?: string;
  slug?: string;
}

export function TeamMembers() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        setIsLoading(true);
        
        // CommunityTeam modeline kayıtlı kullanıcıları public API üzerinden çek
        const response = await api.get("/api/public/teams/members");
        
        if (response.data && response.data.success) {
          setTeamMembers(response.data.members || []);
        } else {
          setError("Takım üyeleri yüklenemedi");
        }
      } catch (err) {
        console.error("Takım üyeleri yüklenirken hata oluştu:", err);
        setError("Takım üyeleri yüklenemedi");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamMembers();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4">
            <Skeleton className="h-[20rem] w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 py-4">{error}</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
      {teamMembers.map((member) => (
        <TeamMemberCard
          key={member.id || member._id}
          name={`${member.name} ${member.lastname}`}
          title={member.title || member.role}
          photo={member.photo}
          avatar={member.avatar}
          slug={member.slug}
          university={member.university}
          universityLogo={member.universityLogo}
        />
      ))}
    </div>
  );
}
