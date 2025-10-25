"use client";

import { createBrowserClient } from "@Faworra/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { verifyOtpAction } from "@/actions/verify-otp-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const formSchema = z.object({ email: z.string().email() });

export function OTPSignIn() {
  const supabase = createBrowserClient();
  const search = useSearchParams();
  const returnTo = search.get("return_to") || "";
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const tokenInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setEmail(values.email);
    try {
      await supabase.auth.signInWithOtp({ email: values.email });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  async function onComplete(token: string) {
    if (!email) return;
    setVerifying(true);
    try {
      if (tokenInputRef.current && formRef.current) {
        tokenInputRef.current.value = token;
        formRef.current.requestSubmit();
      }
    } finally {
      setVerifying(false);
    }
  }

  if (sent) {
    const redirectPath = `/${returnTo || ""}`;
    return (
      <form action={verifyOtpAction} className="flex flex-col items-center gap-3" ref={formRef}>
        <input name="email" type="hidden" value={email} />
        <input name="redirect_to" type="hidden" value={redirectPath} />
        <input name="token" ref={tokenInputRef} type="hidden" />
        <div className="flex h-[62px] w-full items-center justify-center">
          <InputOTP
            autoFocus
            disabled={verifying}
            maxLength={6}
            onComplete={onComplete}
            render={({ slots }) => (
              <InputOTPGroup>
                {slots.map((slot, i) => (
                  <InputOTPSlot key={i} {...slot} className="h-[48px] w-[48px]" />
                ))}
              </InputOTPGroup>
            )}
          />
        </div>
        <div className="text-muted-foreground text-sm">Enter the 6-digit code sent to {email}</div>
        <Button
          disabled={verifying}
          onClick={() => setSent(false)}
          size="sm"
          type="button"
          variant="ghost"
        >
          Resend code
        </Button>
      </form>
    );
  }

  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
      <Input
        placeholder="you@example.com"
        type="email"
        {...form.register("email")}
        autoCapitalize="false"
        autoCorrect="false"
        spellCheck={false as any}
      />
      <Button className="w-full" disabled={loading} type="submit">
        {loading ? "Sending..." : "Continue"}
      </Button>
    </form>
  );
}
