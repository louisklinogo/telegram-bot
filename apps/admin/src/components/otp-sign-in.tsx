"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createBrowserClient } from "@cimantikos/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { verifyOtpAction } from "@/actions/verify-otp-action";

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
      <form action={verifyOtpAction} ref={formRef} className="flex flex-col items-center gap-3">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="redirect_to" value={redirectPath} />
        <input type="hidden" name="token" ref={tokenInputRef} />
        <div className="h-[62px] w-full flex items-center justify-center">
          <InputOTP
            maxLength={6}
            autoFocus
            onComplete={onComplete}
            disabled={verifying}
            render={({ slots }) => (
              <InputOTPGroup>
                {slots.map((slot, i) => (
                  <InputOTPSlot key={i} {...slot} className="w-[48px] h-[48px]" />
                ))}
              </InputOTPGroup>
            )}
          />
        </div>
        <div className="text-sm text-muted-foreground">Enter the 6-digit code sent to {email}</div>
        <Button variant="ghost" size="sm" type="button" onClick={() => setSent(false)} disabled={verifying}>
          Resend code
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <Input
        type="email"
        placeholder="you@example.com"
        {...form.register("email")}
        autoCapitalize="false"
        autoCorrect="false"
        spellCheck={false as any}
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Sending..." : "Continue"}
      </Button>
    </form>
  );
}
