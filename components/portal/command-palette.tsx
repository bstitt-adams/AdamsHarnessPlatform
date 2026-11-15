"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { PORTAL_NAV_GROUPS, type PortalNavItem } from "@/components/portal/portal-sidebar";
import { useFeatureVisibility } from "@/contexts/feature-visibility-context";

const FIXED_ITEMS: PortalNavItem[] = [
  { title: "Command Center", href: "/portal/command-center", icon: Search, featureKey: "commandCenter" },
  { title: "Platform Settings", href: "/portal/settings", icon: Search, featureKey: "settings" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { canSeeFeature } = useFeatureVisibility();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const visible = (item: PortalNavItem) => {
    try {
      return canSeeFeature(item.featureKey);
    } catch {
      return true;
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, tools, and features… (Ctrl+K)" />
      <CommandList>
        <CommandEmpty>No matching page or feature.</CommandEmpty>
        {PORTAL_NAV_GROUPS.map((group) => {
          const items = group.items.filter(visible);
          if (items.length === 0) return null;
          return (
            <CommandGroup key={group.section} heading={group.section}>
              {items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${item.title} ${item.href}`}
                  onSelect={() => go(item.href)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.title}</span>
                  {item.badge && (
                    <span className="ml-auto rounded bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
                      {item.badge}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
        <CommandGroup heading="General">
          {FIXED_ITEMS.filter(visible).map((item) => (
            <CommandItem key={item.href} value={`${item.title} ${item.href}`} onSelect={() => go(item.href)}>
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
