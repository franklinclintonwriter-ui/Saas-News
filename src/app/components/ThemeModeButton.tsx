import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemeMode } from '../context/theme-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { cn } from './ui/utils';

interface ThemeOption {
  value: ThemeMode;
  label: string;
  Icon: typeof Monitor;
}

const themeOptions: ThemeOption[] = [
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

interface ThemeModeButtonProps {
  compact?: boolean;
  className?: string;
}

export function ThemeModeButton({ compact = false, className }: ThemeModeButtonProps) {
  const { mode, resolvedTheme, setMode } = useTheme();
  const activeOption = themeOptions.find((option) => option.value === mode) ?? themeOptions[0];
  const ActiveIcon = mode === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-10 items-center justify-center border border-[#E5E7EB] bg-white text-[#111827] shadow-sm transition hover:bg-[#F3F4F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#194890]/30 dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-accent',
            compact ? 'w-10 rounded-full p-0' : 'gap-2 rounded-lg px-3 text-sm',
            className,
          )}
          aria-label={`Theme: ${activeOption.label}`}
          title={`Theme: ${activeOption.label}`}
        >
          <ActiveIcon size={18} aria-hidden />
          {!compact && <span>{activeOption.label}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[70] w-44">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themeOptions.map(({ value, label, Icon }) => (
          <DropdownMenuItem key={value} className="cursor-pointer" onSelect={() => setMode(value)}>
            <Icon className="text-[#6B7280]" aria-hidden />
            <span>{label}</span>
            {mode === value && <Check className="ml-auto text-[#194890]" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
