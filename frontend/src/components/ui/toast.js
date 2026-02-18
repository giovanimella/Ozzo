import { Toaster } from 'sonner';

export function ToastProvider({ children }) {
  return (
    <>
      {children}
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#fff',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
          },
        }}
      />
    </>
  );
}

export { toast } from 'sonner';
