"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CountrySelector } from "@/components/country-selector";
import { PhoneCountrySelector } from "@/components/phone-country-selector";
import { TagInput } from "@/components/tag-input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateClient, useUpdateClient } from "@/hooks/use-client-mutations";
import { formatPhoneNumber, getPhonePlaceholder } from "@/lib/phone-formatter";

const clientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().min(1, "WhatsApp number is required"),
  email: z.string().email("Invalid email").optional().nullable(),
  address: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  referral_source: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  notes: z.string().optional().nullable(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

interface ClientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: {
    id: string;
    name: string;
    phone: string | null;
    whatsapp?: string | null;
    email: string | null;
    address: string | null;
    country?: string | null;
    countryCode?: string | null;
    company?: string | null;
    occupation?: string | null;
    referral_source: string | null;
    tags?: string[] | null;
    notes: string | null;
  } | null;
}

export function ClientSheet({ open, onOpenChange, client }: ClientSheetProps) {
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const isEdit = !!client;
  const isLoading = createMutation.isPending || updateMutation.isPending;
  const [phoneCountryCode, setPhoneCountryCode] = useState<string>("");
  const [whatsappCountryCode, setWhatsappCountryCode] = useState<string>("+233");

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: client?.name || "",
      phone: client?.phone || "",
      whatsapp: client?.whatsapp || "",
      email: client?.email || "",
      address: client?.address || "",
      country: client?.country || "",
      countryCode: client?.countryCode || "",
      company: client?.company || "",
      occupation: client?.occupation || "",
      referral_source: client?.referral_source || "",
      tags: client?.tags || [],
      notes: client?.notes || "",
    },
  });

  const onSubmit = async (data: ClientFormValues) => {
    const submitData = {
      name: data.name,
      phone: data.phone || null,
      whatsapp: data.whatsapp,
      email: data.email || null,
      address: data.address || null,
      country: data.country || null,
      countryCode: data.countryCode || null,
      company: data.company || null,
      occupation: data.occupation || null,
      referral_source: data.referral_source || null,
      tags: data.tags && data.tags.length > 0 ? data.tags : null,
      notes: data.notes || null,
    };

    if (isEdit && client) {
      await (updateMutation as any).mutateAsync({
        id: client.id,
        data: submitData,
      });
    } else {
      await (createMutation as any).mutateAsync(submitData);
    }

    onOpenChange(false);
    form.reset();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetContent className="flex flex-col overflow-hidden">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="text-xl">{isEdit ? "Edit Client" : "Create Client"}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="scrollbar-hide -mx-1 flex-1 overflow-y-auto px-1">
              <Accordion
                className="space-y-6"
                defaultValue={["general", "details"]}
                type="multiple"
              >
                <AccordionItem value="general">
                  <AccordionTrigger>General</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-normal text-muted-foreground text-xs">
                              Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                autoComplete="off"
                                autoFocus
                                placeholder="Kwame Mensah"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-normal text-muted-foreground text-xs">
                              Email
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                autoComplete="off"
                                placeholder="kwame@example.com"
                                type="email"
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-normal text-muted-foreground text-xs">
                              Phone
                            </FormLabel>
                            <FormControl>
                              <div className="flex gap-0.5">
                                <PhoneCountrySelector
                                  defaultValue={phoneCountryCode}
                                  onSelect={(code) => setPhoneCountryCode(code)}
                                />
                                <Input
                                  {...field}
                                  autoComplete="off"
                                  className="flex-1"
                                  onChange={(e) => {
                                    const formatted = formatPhoneNumber(
                                      phoneCountryCode,
                                      e.target.value
                                    );
                                    field.onChange(formatted);
                                  }}
                                  placeholder={getPhonePlaceholder(phoneCountryCode)}
                                  type="tel"
                                  value={field.value ?? ""}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="whatsapp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-normal text-muted-foreground text-xs">
                              WhatsApp
                            </FormLabel>
                            <FormControl>
                              <div className="flex gap-0.5">
                                <PhoneCountrySelector
                                  defaultValue={whatsappCountryCode}
                                  onSelect={(code) => setWhatsappCountryCode(code)}
                                />
                                <Input
                                  {...field}
                                  autoComplete="off"
                                  className="flex-1"
                                  onChange={(e) => {
                                    const formatted = formatPhoneNumber(
                                      whatsappCountryCode,
                                      e.target.value
                                    );
                                    field.onChange(formatted);
                                  }}
                                  placeholder={getPhonePlaceholder(whatsappCountryCode)}
                                  type="tel"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-normal text-muted-foreground text-xs">
                              Company
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                autoComplete="off"
                                placeholder="Acme Inc"
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="occupation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-normal text-muted-foreground text-xs">
                              Occupation
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                autoComplete="off"
                                placeholder="Business Owner"
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="details">
                  <AccordionTrigger>Details</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-normal text-muted-foreground text-xs">
                              Address
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                autoComplete="off"
                                placeholder="123 Main St, Accra"
                                rows={3}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="countryCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-normal text-muted-foreground text-xs">
                              Country
                            </FormLabel>
                            <FormControl>
                              <CountrySelector
                                defaultValue={field.value ?? ""}
                                onSelect={(code, name) => {
                                  field.onChange(code);
                                  form.setValue("country", name);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="referral_source"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-normal text-muted-foreground text-xs">
                              Referral Source
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                autoComplete="off"
                                placeholder="Instagram, Word of mouth, Facebook"
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-normal text-muted-foreground text-xs">
                              Tags
                            </FormLabel>
                            <FormControl>
                              <TagInput
                                onChange={field.onChange}
                                placeholder="Add tags (VIP, Regular, New...)"
                                suggestions={[
                                  "VIP",
                                  "Regular",
                                  "New",
                                  "Wholesale",
                                  "Retail",
                                  "Premium",
                                ]}
                                value={field.value ?? []}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-normal text-muted-foreground text-xs">
                              Note
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                autoComplete="off"
                                className="resize-none"
                                placeholder="Additional information..."
                                rows={4}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <div className="mt-4 flex flex-shrink-0 justify-end gap-4 border-t pt-4">
              <Button
                disabled={isLoading}
                onClick={() => handleOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <SubmitButton isSubmitting={isLoading} type="submit">
                {isEdit ? "Update" : "Create"}
              </SubmitButton>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
