import { cookies, headers } from "next/headers";
import { OTPSignIn } from "@/components/otp-sign-in";
import { GoogleSignIn } from "@/components/google-sign-in";
import { CookiePreferredSignInProvider } from "@/lib/cookies";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from "next/link";
import { Icons } from "@/components/ui/icons";

function AppleSignInPlaceholder() {
  return (
    <div className="flex items-center justify-center gap-2 border rounded h-10 px-3 opacity-60">
      {/* TODO: Implement Apple OAuth when keys are available */}
      <Icons.Apple /> <span>Continue with Apple</span>
    </div>
  );
}

function GithubSignInPlaceholder() {
  return (
    <div className="opacity-60">
      {/* TODO: Implement GitHub OAuth if desired */}
      <div className="flex items-center justify-center gap-2 border rounded h-10"> 
        <Icons.Github /> <span>Continue with GitHub (coming soon)</span>
      </div>
    </div>
  );
}

function WhatsAppSignInPlaceholder() {
  return (
    <div className="flex items-center justify-center gap-2 border rounded h-10 px-3 opacity-60">
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
    <div className="min-h-screen flex">
      {/* Left hero (hidden on mobile) */}
      <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800" />
      {/* Right: form */}
      <div className="w-full lg:w-1/2 relative">
        <header className="absolute top-0 left-0 w-full p-6">
          <div className="flex items-center gap-2">
            <Icons.FaworraBlack className="h-16 md:h-24 w-auto dark:hidden" />
            <Icons.FaworraWhite className="h-16 md:h-24 w-auto hidden dark:block" />
          </div>
        </header>
        <div className="flex items-center justify-center min-h-screen p-6">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-lg font-serif">Welcome</h1>
              <p className="text-sm text-muted-foreground">Choose how you want to continue</p>
            </div>
            <div className="space-y-4">
              <Primary />
              <div className="flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Or</span>
              </div>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="more" className="border-0">
                  <AccordionTrigger className="justify-center text-sm">Other options</AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-2">
                    <Secondary />
                    <AppleSignInPlaceholder />
                    <WhatsAppSignInPlaceholder />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            <div className="text-center text-xs text-muted-foreground">
              By signing in you agree to our {" "}
              <Link href="#" className="underline">Terms of service</Link> & {" "}
              <Link href="#" className="underline">Privacy policy</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
