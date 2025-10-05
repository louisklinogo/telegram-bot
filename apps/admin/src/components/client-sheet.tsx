"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@cimantikos/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { useCreateClient, useUpdateClient } from "@/hooks/use-client-mutations";
import { CountrySelector } from "@/components/country-selector";
import { TagInput } from "@/components/tag-input";
import { PhoneInput } from "@/components/phone-input";

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
  const [formData, setFormData] = useState({
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
  });

  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();

  const isEdit = !!client;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Update form data when client changes
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || "",
        phone: client.phone || "",
        whatsapp: client.whatsapp || "",
        email: client.email || "",
        address: client.address || "",
        country: client.country || "",
        countryCode: client.countryCode || "",
        company: client.company || "",
        occupation: client.occupation || "",
        referral_source: client.referral_source || "",
        tags: client.tags || [],
        notes: client.notes || "",
      });
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name: formData.name,
      phone: formData.phone || null,
      whatsapp: formData.whatsapp,
      email: formData.email || null,
      address: formData.address || null,
      country: formData.country || null,
      countryCode: formData.countryCode || null,
      company: formData.company || null,
      occupation: formData.occupation || null,
      referral_source: formData.referral_source || null,
      tags: formData.tags.length > 0 ? formData.tags : null,
      notes: formData.notes || null,
    };

    if (isEdit && client) {
      await (updateMutation as any).mutateAsync({
        id: client.id,
        data,
      });
    } else {
      await (createMutation as any).mutateAsync(data);
    }

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      whatsapp: "",
      email: "",
      address: "",
      country: "",
      countryCode: "",
      company: "",
      occupation: "",
      referral_source: "",
      tags: [],
      notes: "",
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col overflow-hidden">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="text-xl">
            {isEdit ? "Edit Client" : "Create Client"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto scrollbar-hide px-1 -mx-1">
            <Accordion
              type="multiple"
              defaultValue={["general", "details"]}
              className="space-y-6"
            >
              <AccordionItem value="general">
                <AccordionTrigger>General</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs text-[#878787] font-normal">
                        Name
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Kwame Mensah"
                        autoComplete="off"
                        required
                        autoFocus
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs text-[#878787] font-normal">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="kwame@example.com"
                        autoComplete="off"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs text-[#878787] font-normal">
                        Phone
                      </Label>
                      <PhoneInput
                        value={formData.phone}
                        onChange={(value) => setFormData({ ...formData, phone: value })}
                        placeholder="Enter phone number"
                        defaultCountry="GH"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whatsapp" className="text-xs text-[#878787] font-normal">
                        WhatsApp
                      </Label>
                      <PhoneInput
                        value={formData.whatsapp}
                        onChange={(value) => setFormData({ ...formData, whatsapp: value })}
                        placeholder="Enter WhatsApp number"
                        defaultCountry="GH"
                      />
                      <p className="text-xs text-muted-foreground">
                        Required for WhatsApp communications
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-xs text-[#878787] font-normal">
                        Company
                      </Label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Acme Inc"
                        autoComplete="off"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="occupation" className="text-xs text-[#878787] font-normal">
                        Occupation
                      </Label>
                      <Input
                        id="occupation"
                        value={formData.occupation}
                        onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                        placeholder="Business Owner"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="details">
                <AccordionTrigger>Details</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-xs text-[#878787] font-normal">
                        Address
                      </Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="123 Main St, Accra"
                        autoComplete="off"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-xs text-[#878787] font-normal">
                        Country
                      </Label>
                      <CountrySelector
                        defaultValue={formData.countryCode}
                        onSelect={(code, name) => {
                          setFormData({
                            ...formData,
                            country: name,
                            countryCode: code,
                          });
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="referral_source" className="text-xs text-[#878787] font-normal">
                        Referral Source
                      </Label>
                      <Input
                        id="referral_source"
                        value={formData.referral_source}
                        onChange={(e) => setFormData({ ...formData, referral_source: e.target.value })}
                        placeholder="Instagram, Word of mouth, Facebook"
                        autoComplete="off"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-[#878787] font-normal">
                        Tags
                      </Label>
                      <TagInput
                        value={formData.tags}
                        onChange={(tags) => setFormData({ ...formData, tags })}
                        placeholder="Add tags (VIP, Regular, New...)"
                        suggestions={["VIP", "Regular", "New", "Wholesale", "Retail", "Premium"]}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-xs text-[#878787] font-normal">
                        Note
                      </Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional information..."
                        autoComplete="off"
                        rows={4}
                        className="resize-none"
                      />
                    </div>
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
      </SheetContent>
    </Sheet>
  );
}
