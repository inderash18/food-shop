import { create } from 'zustand';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (type: ToastType, message: string) => void;
  remove: (id: number) => void;
}

let nextId = 1;

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (type, message) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4500);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(typeOrMessage: ToastType | string, maybeMessage?: string) {
  if (maybeMessage !== undefined) {
    useToast.getState().push(typeOrMessage as ToastType, maybeMessage);
  } else {
    useToast.getState().push('info', typeOrMessage);
  }
}

toast.success = (message: string) => {
  useToast.getState().push('success', message);
};

toast.error = (message: string) => {
  useToast.getState().push('error', message);
};

toast.info = (message: string) => {
  useToast.getState().push('info', message);
};

const icons = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />,
  error: <XCircle className="h-5 w-5 text-rose-500 shrink-0" />,
  info: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
};

export function ToastContainer() {
  const { toasts, remove } = useToast();
  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 z-50 space-y-2 w-[92vw] max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-start gap-2.5 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 animate-in"
        >
          {icons[t.type]}
          <p className="text-xs font-bold text-gray-800 flex-1">{t.message}</p>
          <button onClick={() => remove(t.id)} className="text-gray-400 hover:text-gray-600" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
