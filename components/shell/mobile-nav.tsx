"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./sidebar";

export const MobileNav = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Abrir menu"
        className="lg:hidden"
        onClick={() => setOpen(true)}
      >
        ☰
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} side="left">
        <Sidebar variant="mobile" onNavigate={() => setOpen(false)} />
      </Sheet>
    </>
  );
};
