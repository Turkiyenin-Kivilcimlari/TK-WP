import React from "react";
import { UserRole } from "@/models/User";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "next-auth/react";

interface RoleSelectorProps {
  value: UserRole;
  onChange: (value: UserRole) => void;
  disabled?: boolean;
}

export default function RoleSelector({ value, onChange, disabled = false }: RoleSelectorProps) {
  const { data: session } = useSession();
  const currentUserRole = session?.user?.role;
  
  // Kullanıcının seçebileceği rolleri belirle
  const availableRoles = React.useMemo(() => {
    // Varsayılan olarak tüm roller
    const roles = [
      { value: UserRole.MEMBER, label: "Üye" },
      { value: UserRole.REPRESENTATIVE, label: "Topluluk Temsilcisi" },
      { value: UserRole.ADMIN, label: "Yönetim Üyesi" }
    ];
    
    // Sadece süper yöneticiler süper yönetici atayabilir
    if (currentUserRole === UserRole.SUPERADMIN) {
      roles.push({ value: UserRole.SUPERADMIN, label: "Süper Yönetici" });
    }
    
    return roles;
  }, [currentUserRole]);

  return (
    <Select
      value={value}
      onValueChange={(value) => onChange(value as UserRole)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Rol Seçin" />
      </SelectTrigger>
      <SelectContent>
        {availableRoles.map((role) => (
          <SelectItem key={role.value} value={role.value}>
            {role.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
