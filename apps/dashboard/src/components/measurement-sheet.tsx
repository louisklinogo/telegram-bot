"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, History, Loader2, Ruler, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useCreateMeasurement, useUpdateMeasurement } from "@/hooks/use-measurement-mutations";
import { useClients } from "@/hooks/use-supabase-data";
import type { MeasurementWithClient } from "@/lib/supabase-queries";
import { DynamicMeasurementInput } from "@/components/measurement-input-dynamic";
import { TagInput } from "@/components/tag-input";

// Zod schema for validation
const measurementFormSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  record_name: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  taken_at: z.string().optional(),
  measurements: z.record(z.string(), z.string()),
});

type MeasurementFormValues = z.infer<typeof measurementFormSchema>;

// Common tag suggestions for measurements
const TAG_SUGGESTIONS = [
  "kaftan",
  "shirt",
  "trouser",
  "suit",
  "agbada",
  "two_piece",
  "formal",
  "casual",
  "wedding",
  "traditional",
  "modern",
];

interface MeasurementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  measurement?: MeasurementWithClient | null;
}

export function MeasurementSheet({ open, onOpenChange, measurement }: MeasurementSheetProps) {
  const { data: clients = [] } = useClients();
  const createMutation = useCreateMeasurement();
  const updateMutation = useUpdateMeasurement();
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const isEdit = !!measurement;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  const form = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementFormSchema),
    defaultValues: {
      client_id: "",
      record_name: "",
      tags: [],
      notes: "",
      taken_at: "",
      measurements: {},
    },
  });

  // Reset form when measurement changes or sheet opens
  useEffect(() => {
    if (measurement && open) {
      form.reset({
        client_id: (measurement as any).client_id || "",
        record_name: (measurement as any).record_name || "",
        tags: (measurement as any).tags || [],
        notes: (measurement as any).notes || "",
        taken_at: (measurement as any).taken_at
          ? new Date((measurement as any).taken_at as any).toISOString().split("T")[0]
          : "",
        measurements: ((measurement as any).measurements as Record<string, string>) || {},
      });
    } else if (!measurement && open) {
      form.reset({
        client_id: "",
        record_name: "",
        tags: [],
        notes: "",
        taken_at: new Date().toISOString().split("T")[0],
        measurements: {},
      });
    }
  }, [measurement, open, form]);

  const onSubmit = async (values: MeasurementFormValues) => {
    try {
      // Convert date to ISO datetime string if provided
      let takenAt: string | undefined = undefined;
      if (values.taken_at) {
        const date = new Date(values.taken_at);
        if (!isNaN(date.getTime())) {
          takenAt = date.toISOString();
        }
      }

      if (isEdit && measurement) {
        // Update - pass in camelCase format
        await updateMutation.mutateAsync({
          id: measurement.id,
          clientId: values.client_id,
          recordName: values.record_name,
          tags: values.tags,
          measurements: values.measurements,
          notes: values.notes || null,
          takenAt,
        });
      } else {
        // Create - pass in camelCase format
        await createMutation.mutateAsync({
          clientId: values.client_id,
          recordName: values.record_name,
          tags: values.tags,
          measurements: values.measurements,
          notes: values.notes || null,
          takenAt: takenAt || null,
        });
      }

      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Failed to save measurement:", error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-hidden sm:max-w-[650px] p-0">
        <SheetHeader className="px-6 pt-6 pb-0 flex-shrink-0">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-xl">{isEdit ? "Edit Measurement" : "New Measurement"}</SheetTitle>
            {isEdit && (measurement as any)?.version && (
              <Badge variant="outline" className="text-xs">
                v{(measurement as any).version}
              </Badge>
            )}
            {isEdit && (measurement as any)?.isActive && (
              <Badge variant="default" className="text-xs">
                Active
              </Badge>
            )}
            {isEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVersionHistory(!showVersionHistory)}
              >
                <History className="h-4 w-4 mr-1" />
                History
              </Button>
            )}
          </div>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
              {/* Client Selection - Outside Accordion */}
              <div className="mb-6">
                <FormField
                  control={form.control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground font-normal">
                        Client <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isEdit}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Accordion type="multiple" defaultValue={["measurements"]} className="space-y-6">
                {/* Measurements Section */}
                <AccordionItem value="measurements">
                  <AccordionTrigger>Measurements</AccordionTrigger>
                  <AccordionContent>
                    <FormField
                      control={form.control}
                      name="measurements"
                      render={({ field }) => (
                        <FormItem>
                          <DynamicMeasurementInput
                            measurements={field.value || {}}
                            onChange={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Details/Metadata Section */}
                <AccordionItem value="details">
                  <AccordionTrigger>Details</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {/* Record Name and Date - Grid Layout */}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="record_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground font-normal">
                                Record Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value ?? ""}
                                  placeholder="e.g., Wedding Kaftan 2024"
                                  autoComplete="off"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="taken_at"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground font-normal">
                                Date Taken
                              </FormLabel>
                              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                <FormControl>
                                  <PopoverTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="w-full justify-start text-left font-normal"
                                    >
                                      {field.value ? (
                                        format(new Date(field.value), "PPP")
                                      ) : (
                                        <span className="text-muted-foreground">Select date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                </FormControl>
                                <PopoverContent className="w-auto p-0" align="end">
                                  <Calendar
                                    mode="single"
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date) => {
                                      if (date) {
                                        field.onChange(date.toISOString());
                                      } else {
                                        field.onChange("");
                                      }
                                      setIsDatePickerOpen(false);
                                    }}
                                    initialFocus
                                    toDate={new Date()}
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormDescription className="-mt-2">
                        Optional: Name this measurement set for reference
                      </FormDescription>

                      {/* Tags */}
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
                                value={field.value || []}
                                onChange={field.onChange}
                                placeholder="Add tags (e.g., kaftan, formal, wedding)"
                                suggestions={TAG_SUGGESTIONS}
                              />
                            </FormControl>
                            <FormDescription>
                              Optional: Tag this measurement for categorization
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Notes */}
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground font-normal">
                              Notes
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                value={field.value ?? ""}
                                placeholder="Additional notes about this measurement..."
                                className="flex min-h-[80px] resize-none"
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
              </Accordion>
            </div>

            <div className="flex-shrink-0 flex justify-end gap-4 px-6 py-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <SubmitButton
                type="submit"
                isSubmitting={isLoading}
                disabled={!form.formState.isDirty}
              >
                {isEdit ? "Update" : "Create"}
              </SubmitButton>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
