"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useCreateMeasurement, useUpdateMeasurement } from "@/hooks/use-measurement-mutations";
import { useClients } from "@/hooks/use-supabase-data";
import type { MeasurementWithClient } from "@/lib/supabase-queries";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Ruler } from "lucide-react";

// Zod schema for validation
const measurementFormSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  record_name: z.string().optional(),
  garment_type: z.enum(["kaftan", "shirt", "trouser", "suit", "agbada", "two_piece"], {
    required_error: "Please select a garment type",
  }),
  notes: z.string().optional(),
  taken_at: z.string().optional(),
  measurements: z.record(z.string()).optional(),
});

type MeasurementFormValues = z.infer<typeof measurementFormSchema>;

// All measurement fields
const MEASUREMENT_FIELDS: Record<string, { label: string; placeholder: string }> = {
  chest: { label: "Chest (CH)", placeholder: "e.g., 42 or 42/44" },
  stomach: { label: "Stomach (ST)", placeholder: "e.g., 40 or 40/42" },
  waist: { label: "Waist (WT)", placeholder: "e.g., 36 or 36/38" },
  hips: { label: "Hip (HP)", placeholder: "e.g., 42 or 42/44" },
  lap: { label: "Lap (LP)", placeholder: "e.g., 24 or 24/26" },
  neck: { label: "Neck (NK)", placeholder: "e.g., 16.5 or 16.5/17" },
  shoulder: { label: "Shoulder (SH)", placeholder: "e.g., 19 or 19/20" },
  top_length: { label: "Top Length (TL)", placeholder: "e.g., 48 or 48/50" },
  pant_length: { label: "Pant Length (PL)", placeholder: "e.g., 42 or 42/44" },
  sleeve_length: { label: "Sleeve Length (SL)", placeholder: "e.g., 25 or 25/26" },
  bicep_round: { label: "Bicep Round (BR)", placeholder: "e.g., 15 or 15/16" },
  ankle_round: { label: "Ankle Round (AR)", placeholder: "e.g., 11 or 11/12" },
  calf: { label: "Calf (CF)", placeholder: "e.g., 14 or 14/15" },
  thigh: { label: "Thigh (TH)", placeholder: "e.g., 24 or 24/26" },
  knee: { label: "Knee (KN)", placeholder: "e.g., 18 or 18/19" },
  back_length: { label: "Back Length (BL)", placeholder: "e.g., 32 or 32/34" },
  jacket_length: { label: "Jacket Length (JL)", placeholder: "e.g., 30 or 30/32" },
};

const FIELD_ORDER = [
  "chest", "stomach", "waist", "hips", "lap", "neck", "shoulder",
  "top_length", "pant_length", "sleeve_length", "bicep_round", "ankle_round",
  "calf", "thigh", "knee", "back_length", "jacket_length"
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

  const isEdit = !!measurement;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  const form = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementFormSchema),
    defaultValues: {
      client_id: "",
      record_name: "",
      garment_type: "kaftan",
      notes: "",
      taken_at: "",
      measurements: {},
    },
  });

  // Reset form when measurement changes or sheet opens
  useEffect(() => {
    if (measurement && open) {
      form.reset({
        client_id: measurement.client_id || "",
        record_name: measurement.record_name || "",
        garment_type: (measurement.garment_type as any) || "kaftan",
        notes: measurement.notes || "",
        taken_at: measurement.taken_at 
          ? new Date(measurement.taken_at).toISOString().split("T")[0] 
          : "",
        measurements: (measurement.measurements as Record<string, string>) || {},
      });
    } else if (!measurement && open) {
      form.reset({
        client_id: "",
        record_name: "",
        garment_type: "kaftan",
        notes: "",
        taken_at: new Date().toISOString().split("T")[0],
        measurements: {},
      });
    }
  }, [measurement, open, form]);

  const onSubmit = async (values: MeasurementFormValues) => {
    try {
      const measurementData = {
        ...values,
        taken_at: values.taken_at || new Date().toISOString(),
      };

      if (isEdit && measurement) {
        await updateMutation.mutateAsync({
          id: measurement.id,
          data: measurementData,
        });
      } else {
        await createMutation.mutateAsync(measurementData);
      }
      
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Failed to save measurement:", error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[650px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Ruler className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg">
                {isEdit ? "Edit Measurement" : "New Measurement"}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {isEdit ? "Update measurement details" : "Record client measurements (dual values supported)"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Separator />

        <ScrollArea className="flex-1 px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
              {/* Client Selection */}
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Client <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEdit}
                    >
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

              {/* Record Name */}
              <FormField
                control={form.control}
                name="record_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Record Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Wedding Kaftan 2024" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional: Name this measurement set for reference
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Garment Type */}
              <FormField
                control={form.control}
                name="garment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Garment Type <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="kaftan">Kaftan</SelectItem>
                        <SelectItem value="shirt">Shirt</SelectItem>
                        <SelectItem value="trouser">Trouser</SelectItem>
                        <SelectItem value="suit">Suit</SelectItem>
                        <SelectItem value="agbada">Agbada</SelectItem>
                        <SelectItem value="two_piece">Two Piece</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Measurements Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-base">Measurements (inches)</FormLabel>
                  <span className="text-xs text-muted-foreground">Fill relevant fields</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {FIELD_ORDER.map((fieldKey) => {
                    const field = MEASUREMENT_FIELDS[fieldKey];
                    if (!field) return null;

                    return (
                      <FormField
                        key={fieldKey}
                        control={form.control}
                        name={`measurements.${fieldKey}` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-normal">
                              {MEASUREMENT_FIELDS[fieldKey].label}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={MEASUREMENT_FIELDS[fieldKey].placeholder}
                                {...field}
                                className="h-9"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Date Taken */}
              <FormField
                control={form.control}
                name="taken_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Taken</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
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
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about this measurement..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>

        <Separator />

        <SheetFooter className="px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={isLoading || !form.formState.isValid}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
