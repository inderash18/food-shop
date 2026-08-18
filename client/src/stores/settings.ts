import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppSettings {
  // Appearance
  theme: 'light' | 'dark' | 'system';
  reducedMotion: boolean;
  compactMode: boolean;

  // Notifications
  orderStatusAlerts: boolean;
  preparationReadyAlerts: boolean;
  emailReceipts: boolean;
  smsUpdates: boolean;
  promotionalOffers: boolean;

  // Privacy & Preferences
  language: string;
  currency: string;
  shareOrderFeedback: boolean;
  defaultDeliveryNotes: string;
  savePaymentDetails: boolean;
  ecoCutleryDefault: boolean;
}

interface SettingsState {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: AppSettings = {
  theme: 'light',
  reducedMotion: false,
  compactMode: false,
  orderStatusAlerts: true,
  preparationReadyAlerts: true,
  emailReceipts: true,
  smsUpdates: true,
  promotionalOffers: false,
  language: 'English (India)',
  currency: 'INR (₹)',
  shareOrderFeedback: true,
  defaultDeliveryNotes: 'Call upon arrival at counter.',
  savePaymentDetails: true,
  ecoCutleryDefault: true,
};

export function applyTheme(theme: 'light' | 'dark' | 'system') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSetting: (key, value) => {
        if (key === 'theme') {
          applyTheme(value as 'light' | 'dark' | 'system');
        }
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        }));
      },
      updateSettings: (partial) => {
        if (partial.theme) {
          applyTheme(partial.theme);
        }
        set((state) => ({
          settings: { ...state.settings, ...partial },
        }));
      },
      resetSettings: () => {
        applyTheme(defaultSettings.theme);
        set({ settings: defaultSettings });
      },
    }),
    {
      name: 'campus_food_settings',
      onRehydrateStorage: () => (state) => {
        if (state?.settings?.theme) {
          applyTheme(state.settings.theme);
        }
      },
    }
  )
);

// System preference listener
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemThemeChange = () => {
    const currentTheme = useSettingsStore.getState().settings.theme;
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  };
  mediaQuery.addEventListener('change', handleSystemThemeChange);

  // Initial apply on module load
  try {
    const rawStored = localStorage.getItem('campus_food_settings');
    if (rawStored) {
      const parsed = JSON.parse(rawStored);
      if (parsed?.state?.settings?.theme) {
        applyTheme(parsed.state.settings.theme);
      }
    }
  } catch {
    // Ignore JSON parse errors
  }
}
