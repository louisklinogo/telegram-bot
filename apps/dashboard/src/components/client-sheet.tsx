"use client";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreateClient, useUpdateClient } from "@/hooks/use-client-mutations";
import { CountrySelector } from "@/components/country-selector";
import { PhoneCountrySelector } from "@/components/phone-country-selector";
import { TagInput } from "@/components/tag-input";
import { formatPhoneNumber, getPhonePlaceholder } from "@/lib/phone-formatter";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col overflow-hidden">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="text-xl">{isEdit ? "Edit Client" : "Create Client"}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto scrollbar-hide px-1 -mx-1">
              <Accordion type="multiple" defaultValue={["general", "details"]} className="space-y-6">
                <AccordionItem value="general">
                  <AccordionTrigger>General</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground font-normal">
                              Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Kwame Mensah"
                                autoComplete="off"
                                autoFocus
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
                            <FormLabel className="text-xs text-muted-foreground font-normal">
                              Email
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value ?? ""}
                                type="email"
                                placeholder="kwame@example.com"
                                autoComplete="off"
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
                            <FormLabel className="text-xs text-muted-foreground font-normal">
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
                                  value={field.value ?? ""}
                                  type="tel"
                                  placeholder={getPhonePlaceholder(phoneCountryCode)}
                                  autoComplete="off"
                                  className="flex-1"
                                  onChange={(e) => {
                                    const formatted = formatPhoneNumber(phoneCountryCode, e.target.value);
                                    field.onChange(formatted);
                                  }}
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
                            <FormLabel className="text-xs text-muted-foreground font-normal">
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
                                  type="tel"
                                  placeholder={getPhonePlaceholder(whatsappCountryCode)}
                                  autoComplete="off"
                                  className="flex-1"
                                  onChange={(e) => {
                                    const formatted = formatPhoneNumber(whatsappCountryCode, e.target.value);
                                    field.onChange(formatted);
                                  }}
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
                            <FormLabel className="text-xs text-muted-foreground font-normal">
                              Company
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value ?? ""}
                                placeholder="Acme Inc"
                                autoComplete="off"
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
                            <FormLabel className="text-xs text-muted-foreground font-normal">
                              Occupation
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value ?? ""}
                                placeholder="Business Owner"
                                autoComplete="off"
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
                            <FormLabel className="text-xs text-muted-foreground font-normal">
                              Address
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                value={field.value ?? ""}
                                placeholder="123 Main St, Accra"
                                autoComplete="off"
                                rows={3}
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
                            <FormLabel className="text-xs text-muted-foreground font-normal">
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
                            <FormLabel className="text-xs text-muted-foreground font-normal">
                              Referral Source
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value ?? ""}
                                placeholder="Instagram, Word of mouth, Facebook"
                                autoComplete="off"
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
                            <FormLabel className="text-xs text-muted-foreground font-normal">
                              Tags
                            </FormLabel>
                            <FormControl>
                              <TagInput
                                value={field.value ?? []}
                                onChange={field.onChange}
                                placeholder="Add tags (VIP, Regular, New...)"
                                suggestions={["VIP", "Regular", "New", "Wholesale", "Retail", "Premium"]}
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
                            <FormLabel className="text-xs text-muted-foreground font-normal">
                              Note
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                value={field.value ?? ""}
                                placeholder="Additional information..."
                                autoComplete="off"
                                rows={4}
                                className="resize-none"
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

            <div className="flex-shrink-0 flex justify-end gap-4 pt-4 border-t mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <SubmitButton type="submit" isSubmitting={isLoading}>
                {isEdit ? "Update" : "Create"}
              </SubmitButton>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
