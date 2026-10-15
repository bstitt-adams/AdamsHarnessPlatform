"use client";

import { motion } from "framer-motion";
import { MapPin, Building2, HardHat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BilingualText } from "@/components/shared/bilingual-text";
import type { SiteCalendarDoc } from "@/lib/schema";

interface SiteCardProps {
  site: SiteCalendarDoc;
  onClick: () => void;
  index: number;
}

const icons = [MapPin, Building2, HardHat];

export function SiteCard({ site, onClick, index }: SiteCardProps) {
  const Icon = icons[index % icons.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
    >
      <Card
        className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-[#005A9C]"
        onClick={onClick}
      >
        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#005A9C]/10 flex items-center justify-center">
            <Icon className="h-8 w-8 text-[#005A9C]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{site.name}</h2>
          <p className="text-sm text-muted-foreground">
            <BilingualText
              en="Click to view the safety office calendar"
              es="Haga clic para ver el calendario de la oficina de seguridad"
            />
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
