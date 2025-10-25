"use client";

import { useToast } from "@/components/ui/use-toast";
import { Icons } from "./icons";
import { Progress } from "./progress";
import { Spinner } from "./spinner";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, progress = 0, action, footer, ...props }) => (
        <Toast key={id} {...props} className="flex flex-col">
          <div className="flex w-full">
            <div className="w-full justify-center space-y-2">
              <div className="flex justify-between space-x-2">
                <div className="flex items-center space-x-2">
                  {props?.variant && (
                    <div className="flex h-[20px] w-[20px] items-center">
                      {props.variant === "ai" && <Icons.AI className="text-blue-600" />}
                      {props?.variant === "success" && <Icons.Check />}
                      {props?.variant === "error" && <Icons.Error className="text-destructive" />}
                      {props?.variant === "progress" && (
                        <Spinner className="h-4 w-4 animate-spin" />
                      )}
                      {props?.variant === "spinner" && <Spinner className="h-4 w-4 animate-spin" />}
                    </div>
                  )}
                  <div>{title && <ToastTitle>{title}</ToastTitle>}</div>
                </div>

                <div>
                  {props?.variant === "progress" && (
                    <span className="text-muted-foreground text-sm">{progress}%</span>
                  )}
                </div>
              </div>

              {props.variant === "progress" && (
                <Progress className="h-[3px] w-full rounded-none bg-border" value={progress} />
              )}

              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </div>

          <div className="flex w-full justify-end">{footer}</div>
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
