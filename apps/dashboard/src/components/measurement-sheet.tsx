"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, History, Loader2, Ruler, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { DynamicMeasurementInput } from "@/components/measurement-input-dynamic";
import { TagInput } from "@/components/tag-input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateMeasurement, useUpdateMeasurement } from "@/hooks/use-measurement-mutations";
import { useClients } from "@/hooks/use-supabase-data";
import type { MeasurementWithClient } from "@/lib/supabase-queries";

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
      let takenAt: string | undefined;
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
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="flex flex-col overflow-hidden p-0 sm:max-w-[650px]">
        <SheetHeader className="flex-shrink-0 px-6 pt-6 pb-0">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-xl">
              {isEdit ? "Edit Measurement" : "New Measurement"}
            </SheetTitle>
            {isEdit && (measurement as any)?.version && (
              <Badge className="text-xs" variant="outline">
                v{(measurement as any).version}
              </Badge>
            )}
            {isEdit && (measurement as any)?.isActive && (
              <Badge className="text-xs" variant="default">
                Active
              </Badge>
            )}
            {isEdit && (
              <Button
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                size="sm"
                variant="outline"
              >
                <History className="mr-1 h-4 w-4" />
                History
              </Button>
            )}
          </div>
        </SheetHeader>

        <Form {...form}>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="scrollbar-hide flex-1 overflow-y-auto px-6 py-4">
              {/* Client Selection - Outside Accordion */}
              <div className="mb-6">
                <FormField
                  control={form.control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-normal text-muted-foreground text-xs">
                        Client <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select disabled={isEdit} onValueChange={field.onChange} value={field.value}>
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

              <Accordion className="space-y-6" defaultValue={["measurements"]} type="multiple">
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
                              <FormLabel className="font-normal text-muted-foreground text-xs">
                                Record Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  autoComplete="off"
                                  placeholder="e.g., Wedding Kaftan 2024"
                                  value={field.value ?? ""}
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
                              <FormLabel className="font-normal text-muted-foreground text-xs">
                                Date Taken
                              </FormLabel>
                              <Popover onOpenChange={setIsDatePickerOpen} open={isDatePickerOpen}>
                                <FormControl>
                                  <PopoverTrigger asChild>
                                    <Button
                                      className="w-full justify-start text-left font-normal"
                                      type="button"
                                      variant="outline"
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
                                <PopoverContent align="end" className="w-auto p-0">
                                  <Calendar
                                    initialFocus
                                    mode="single"
                                    onSelect={(date) => {
                                      if (date) {
                                        field.onChange(date.toISOString());
                                      } else {
                                        field.onChange("");
                                      }
                                      setIsDatePickerOpen(false);
                                    }}
                                    selected={field.value ? new Date(field.value) : undefined}
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
                            <FormLabel className="font-normal text-muted-foreground text-xs">
                              Tags
                            </FormLabel>
                            <FormControl>
                              <TagInput
                                onChange={field.onChange}
                                placeholder="Add tags (e.g., kaftan, formal, wedding)"
                                suggestions={TAG_SUGGESTIONS}
                                value={field.value || []}
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
                            <FormLabel className="font-normal text-muted-foreground text-xs">
                              Notes
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                autoComplete="off"
                                className="flex min-h-[80px] resize-none"
                                placeholder="Additional notes about this measurement..."
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

            <div className="flex flex-shrink-0 justify-end gap-4 border-t px-6 py-4">
              <Button
                disabled={isLoading}
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <SubmitButton
                disabled={!form.formState.isDirty}
                isSubmitting={isLoading}
                type="submit"
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
