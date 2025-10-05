import { parseAsString, useQueryStates } from "nuqs";

export function useTransactionParams() {
  const [params, setParams] = useQueryStates({
    type: parseAsString,
    transactionId: parseAsString,
    invoiceId: parseAsString,
    clientId: parseAsString,
  });

  const isOpen = params.type === "create" || !!params.transactionId;

  const open = (options?: { transactionId?: string; invoiceId?: string; clientId?: string }) => {
    if (options?.transactionId) {
      setParams({ type: "edit", transactionId: options.transactionId });
    } else {
      setParams({ 
        type: "create", 
        invoiceId: options?.invoiceId || null,
        clientId: options?.clientId || null,
      });
    }
  };

  const close = () => {
    setParams({ type: null, transactionId: null, invoiceId: null, clientId: null });
  };

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
