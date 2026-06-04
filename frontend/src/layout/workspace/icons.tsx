import {
  RotateCcw,
  Gamepad2,
  ChartBar,
  Users,
  Binoculars,
  Calendar,
  Wrench,
  Flame,
  Search,
  BookOpen,
  MessageCircle,
  Brain,
  ClipboardList,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type IconName =
  | "rotate-ccw"
  | "gamepad-2"
  | "chart-bar"
  | "users"
  | "binoculars"
  | "calendar"
  | "wrench"
  | "flame"
  | "search"
  | "book-open"
  | "message-circle"
  | "brain"
  | "clipboard-list";

const iconMap: Record<IconName, LucideIcon> = {
  "rotate-ccw": RotateCcw,
  "gamepad-2": Gamepad2,
  "chart-bar": ChartBar,
  users: Users,
  binoculars: Binoculars,
  calendar: Calendar,
  wrench: Wrench,
  flame: Flame,
  search: Search,
  "book-open": BookOpen,
  "message-circle": MessageCircle,
  brain: Brain,
  "clipboard-list": ClipboardList,
};

export function getIcon(name: IconName): LucideIcon {
  return iconMap[name];
}

export { RotateCcw, Gamepad2, ChartBar, Users, Binoculars, Calendar, Wrench, Flame, Search, BookOpen, MessageCircle, Brain, ClipboardList };
