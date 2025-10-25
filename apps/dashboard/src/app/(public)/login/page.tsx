import { cookies, headers } from "next/headers";
import Link from "next/link";
import { GoogleSignIn } from "@/components/google-sign-in";
import { OTPSignIn } from "@/components/otp-sign-in";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Icons } from "@/components/ui/icons";
import { CookiePreferredSignInProvider } from "@/lib/cookies";

function AppleSignInPlaceholder() {
  return (
    <div className="flex h-10 items-center justify-center gap-2 rounded border px-3 opacity-60">
      {/* TODO: Implement Apple OAuth when keys are available */}
      <Icons.Apple /> <span>Continue with Apple</span>
    </div>
  );
}

function GithubSignInPlaceholder() {
  return (
    <div className="opacity-60">
      {/* TODO: Implement GitHub OAuth if desired */}
      <div className="flex h-10 items-center justify-center gap-2 rounded border">
        <Icons.Github /> <span>Continue with GitHub (coming soon)</span>
      </div>
    </div>
  );
}

function WhatsAppSignInPlaceholder() {
  return (
    <div className="flex h-10 items-center justify-center gap-2 rounded border px-3 opacity-60">
      {/* TODO: Consider WhatsApp-based sign-in/number verification flow */}
      <Icons.WhatsApp className="h-9 w-10" />
      <span>Continue with WhatsApp</span>
    </div>
  );
}

export default async function LoginPage() {
  const cookieStore = await cookies();
  const preferred = cookieStore.get(CookiePreferredSignInProvider)?.value;
  const primary = preferred === "otp" ? "otp" : "google";

  const Primary = primary === "otp" ? OTPSignIn : GoogleSignIn;
  const Secondary = primary === "otp" ? GoogleSignIn : OTPSignIn;

  return (
    <div className="flex min-h-screen">
      {/* Left hero (hidden on mobile) */}
      <div className="hidden bg-gradient-to-br from-gray-50 to-gray-100 lg:block lg:w-1/2 dark:from-zinc-900 dark:to-zinc-800" />
      {/* Right: form */}
      <div className="relative w-full lg:w-1/2">
        <header className="absolute top-0 left-0 w-full p-6">
          <div className="flex items-center gap-2">
            <Icons.FaworraBlack className="h-16 w-auto md:h-24 dark:hidden" />
            <Icons.FaworraWhite className="hidden h-16 w-auto md:h-24 dark:block" />
          </div>
        </header>
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-md space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="font-serif text-lg">Welcome</h1>
              <p className="text-muted-foreground text-sm">Choose how you want to continue</p>
            </div>
            <div className="space-y-4">
              <Primary />
              <div className="flex items-center justify-center">
                <span className="text-muted-foreground text-xs">Or</span>
              </div>
              <Accordion className="w-full" collapsible type="single">
                <AccordionItem className="border-0" value="more">
                  <AccordionTrigger className="justify-center text-sm">
                    Other options
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-2">
                    <Secondary />
                    <AppleSignInPlaceholder />
                    <WhatsAppSignInPlaceholder />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            <div className="text-center text-muted-foreground text-xs">
              By signing in you agree to our{" "}
              <Link className="underline" href="#">
                Terms of service
              </Link>{" "}
              &{" "}
              <Link className="underline" href="#">
                Privacy policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
