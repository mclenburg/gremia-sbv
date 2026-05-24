import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import {
  ConfirmDialog,
  type ConfirmDialogVariant,
} from "./IndustrialDialogs";

export type { ConfirmDialogVariant };

export type ConfirmDialogRequest = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
};

type PendingConfirmDialog = ConfirmDialogRequest & {
  resolve: (confirmed: boolean) => void;
};

const ConfirmDialogContext = createContext<
  ((request: ConfirmDialogRequest) => Promise<boolean>) | null
>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirmDialog | null>(null);

  const confirm = useCallback(
    (request: ConfirmDialogRequest) =>
      new Promise<boolean>((resolve) => {
        setPending({
          variant: "warning",
          cancelLabel: "Abbrechen",
          confirmLabel: "Fortfahren",
          ...request,
          resolve,
        });
      }),
    [],
  );

  const close = useCallback((confirmed: boolean) => {
    setPending((current) => {
      current?.resolve(confirmed);
      return null;
    });
  }, []);

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      {pending ? (
        <ConfirmDialog
          title={pending.title}
          message={pending.message}
          confirmLabel={pending.confirmLabel}
          cancelLabel={pending.cancelLabel}
          variant={pending.variant}
          onCancel={() => close(false)}
          onConfirm={() => close(true)}
        />
      ) : null}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const confirm = useContext(ConfirmDialogContext);
  if (!confirm) {
    throw new Error("useConfirmDialog must be used within ConfirmDialogProvider.");
  }
  return confirm;
}
