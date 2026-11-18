"use client";

import { MonitorIcon, MoonIcon, SettingsIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { FieldLegend, FieldSet } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function SettingsPopover() {
  const { theme, setTheme } = useTheme();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Popover>
          <PopoverTrigger
            render={
              <SidebarMenuButton
                tooltip="Settings"
                className="h-10 transition-colors group-data-[collapsible=icon]:min-h-0"
              />
            }
          >
            <SettingsIcon aria-hidden="true" />
            <span>Settings</span>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" sideOffset={8}>
            <PopoverHeader>
              <PopoverTitle>Settings</PopoverTitle>
            </PopoverHeader>
            <FieldSet>
              <FieldLegend variant="label">Theme</FieldLegend>
              <ToggleGroup
                aria-label="Theme"
                variant="outline"
                spacing={0}
                className="w-full"
                value={theme ? [theme] : []}
                onValueChange={([value]) => {
                  if (value) setTheme(value);
                }}
              >
                <ToggleGroupItem value="light" className="flex-1">
                  <SunIcon aria-hidden="true" data-icon="inline-start" />
                  Light
                </ToggleGroupItem>
                <ToggleGroupItem value="dark" className="flex-1">
                  <MoonIcon aria-hidden="true" data-icon="inline-start" />
                  Dark
                </ToggleGroupItem>
                <ToggleGroupItem value="system" className="flex-1">
                  <MonitorIcon aria-hidden="true" data-icon="inline-start" />
                  System
                </ToggleGroupItem>
              </ToggleGroup>
            </FieldSet>
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
