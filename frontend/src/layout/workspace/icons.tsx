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
  HelpCircle,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
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
  "help-circle": HelpCircle,
  settings: Settings,
};

export function getIcon(name: string): LucideIcon {
  return iconMap[name] || HelpCircle;
}

export { RotateCcw, Gamepad2, ChartBar, Users, Binoculars, Calendar, Wrench, Flame, Search, BookOpen, MessageCircle, Brain, ClipboardList, HelpCircle, Settings };
