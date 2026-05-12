"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export const LogoutButton = () => {
  const router = useRouter();
  const onLogout = async () => {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  };
  return (
    <Button size="sm" variant="ghost" onClick={onLogout}>
      Salir
    </Button>
  );
};
