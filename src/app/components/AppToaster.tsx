import { Toaster } from 'sonner';
import { useTheme } from '../context/theme-context';

export function AppToaster() {
  const { resolvedTheme } = useTheme();

  return <Toaster theme={resolvedTheme} richColors position="top-right" closeButton duration={4500} />;
}
