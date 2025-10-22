import { parseAsString, useQueryStates } from "nuqs";
import { useCallback } from "react";

export function useTransactionParams() {
  const [params, setParams] = useQueryStates(
    {
      sheet: parseAsString,
      transactionId: parseAsString,
      invoiceId: parseAsString,
      clientId: parseAsString,
    },
    {
      // Prevent full rerenders/navigations; keep client-side state only
      shallow: true,
    },
  );

  const isOpen = params.sheet === "create" || !!params.transactionId;

  const open = useCallback(
    (options?: { transactionId?: string; invoiceId?: string; clientId?: string }) => {
      if (options?.transactionId) {
        setParams({ sheet: "edit", transactionId: options.transactionId });
      } else {
        setParams({
          sheet: "create",
          invoiceId: options?.invoiceId || null,
          clientId: options?.clientId || null,
        });
      }
    },
    [setParams],
  );

  const close = useCallback(() => {
    setParams({ sheet: null, transactionId: null, invoiceId: null, clientId: null });
  }, [setParams]);

  return {
    isOpen,
    sheet: params.sheet,
    transactionId: params.transactionId,
    invoiceId: params.invoiceId,
    clientId: params.clientId,
    open,
    close,
  };
}
