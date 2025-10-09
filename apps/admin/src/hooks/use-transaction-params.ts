import { parseAsString, useQueryStates } from "nuqs";
import { useCallback } from "react";

export function useTransactionParams() {
  const [params, setParams] = useQueryStates(
    {
      type: parseAsString,
      transactionId: parseAsString,
      invoiceId: parseAsString,
      clientId: parseAsString,
    },
    {
      // Prevent full rerenders/navigations; keep client-side state only
      shallow: true,
    },
  );

  const isOpen = params.type === "create" || !!params.transactionId;

  const open = useCallback(
    (options?: { transactionId?: string; invoiceId?: string; clientId?: string }) => {
      if (options?.transactionId) {
        setParams({ type: "edit", transactionId: options.transactionId });
      } else {
        setParams({
          type: "create",
          invoiceId: options?.invoiceId || null,
          clientId: options?.clientId || null,
        });
      }
    },
    [setParams],
  );

  const close = useCallback(() => {
    setParams({ type: null, transactionId: null, invoiceId: null, clientId: null });
  }, [setParams]);

  return {
    isOpen,
    type: params.type,
    transactionId: params.transactionId,
    invoiceId: params.invoiceId,
    clientId: params.clientId,
    open,
    close,
  };
}
