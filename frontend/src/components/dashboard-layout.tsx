"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  GitBranch,
  KeyRound,
  BookOpen,
  Edit3,
  Menu,
  LogOut,
  UserIcon,
  type LucideIcon,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { authClient } from "@/lib/auth-client";
import { useSession } from "@/features/auth/auth-hook";
import { ModeToggle } from "./mode-toggle";

const NAV_SECTIONS: { icon: LucideIcon; label: string; href: string }[][] = [
  [
    { icon: LayoutDashboard, label: "Overview", href: "/" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ],
  [
    { icon: GitBranch, label: "Workflows", href: "/workflows" },
    { icon: KeyRound, label: "Credentials", href: "/credentials" },
  ],
  [{ icon: BookOpen, label: "Docs", href: "/docs" }],
];

const getInitials = (name?: string | null): string => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toLowerCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toLowerCase();
};

const isActive = (href: string, currentPath: string): boolean => {
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(href + "/");
};

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}

const NavItem = ({ icon: Icon, label, active, onClick }: NavItemProps) => (
  <Button
    variant="ghost"
    onClick={onClick}
    className={cn(
      "flex items-center gap-2.5 w-full px-3 py-[7px] rounded-md text-sm transition-colors justify-start",
      active
        ? "bg-accent text-accent-foreground font-medium"
        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
    )}
  >
    <Icon size={15} strokeWidth={1.6} />
    {label}
  </Button>
);

interface SidebarNavProps {
  activePath: string;
  onNav: (href: string) => void;
}

const SidebarNav = ({ activePath, onNav }: SidebarNavProps) => {
  const { user } = useSession();

  return (
    <div className="flex flex-col flex-1 overflow-y-auto px-3 pt-6 pb-2 gap-1 min-h-0">
      <div className="px-2 mb-5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground truncate">
            {user?.name ?? "—"}
          </span>
          <Edit3
            size={12}
            className="shrink-0 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          Free Plan · {user?.email ?? "—"}
        </p>
      </div>

      {NAV_SECTIONS.map((section, si) => (
        <div key={si}>
          {si > 0 && <Separator className="my-2" />}
          <div className="flex flex-col gap-0.5">
            {section.map(({ icon, label, href }) => (
              <NavItem
                key={href}
                icon={icon}
                label={label}
                active={isActive(href, activePath)}
                onClick={() => onNav(href)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { user } = useSession();

  const initials = getInitials(user?.name);

  function handleNav(href: string) {
    router.push(href);
    setSheetOpen(false);
  }

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/sign-in");
  }

  return (
    <div className="max-w-6xl mx-auto flex h-screen bg-background text-foreground overflow-hidden">
      <aside className="hidden md:flex w-[260px] shrink-0 flex-col h-screen border-r border-border bg-background">
        <SidebarNav activePath={pathname} onNav={handleNav} />
      </aside>

      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        <header className="shrink-0 flex items-center justify-between md:justify-end gap-5 px-4 md:px-8 py-3.5 border-b border-border bg-background">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden p-1 -ml-1 rounded-md hover:bg-accent transition-colors">
                <Menu size={18} />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[260px]">
              <SidebarNav activePath={pathname} onNav={handleNav} />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-5">
            <ModeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="outline-none">
                  <Avatar className="size-7 cursor-pointer hover:opacity-75 transition-opacity">
                    <AvatarFallback className="text-xs font-medium bg-muted text-muted-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="bottom"
                sideOffset={8}
                className="w-48"
              >
                <div className="px-2 py-2">
                  <p className="text-xs font-medium text-foreground truncate">
                    {user?.name ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email ?? "—"}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => router.push(`/profile/${user?.id}`)}
                >
                  <UserIcon size={14} className="mr-2" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut size={14} className="mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
