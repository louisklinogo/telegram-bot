"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Combobox, type Option } from "@/components/ui/combobox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SubmitButton } from "@/components/ui/submit-button";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc/client";
import { InputColor } from "./input-color";

type CategoryNode = {
  id: string;
  name: string;
  color: string | null;
  parentId: string | null;
  children?: CategoryNode[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId?: string | null;
  categories?: CategoryNode[];
  defaultTaxType?: string;
};

export function CategoryCreateSheet({
  open,
  onOpenChange,
  parentId = null,
  categories = [],
  defaultTaxType = "",
}: Props) {
  const utils = trpc.useUtils();
  const router = useRouter();

  const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    color: z.string(),
    description: z.string().optional(),
    parentId: z.string().uuid().optional(),
    taxType: z.enum(["vat", "gst", "sales_tax"]).optional(),
    taxRate: z.union([z.string(), z.number()]).optional(),
    taxReportingCode: z.string().optional(),
    excluded: z.boolean().optional(),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      color: "#8B5CF6",
      description: "",
      parentId: parentId ?? undefined,
      taxType: undefined,
      taxRate: "",
      taxReportingCode: "",
      excluded: false,
    },
  });

  const { mutateAsync, isPending } = trpc.transactionCategories.create.useMutation({
    onSuccess: async () => {
      await utils.transactionCategories.list.invalidate();
      onOpenChange(false);
      router.refresh();
      form.reset();
    },
  });

  const onSubmit = async (values: FormValues) => {
    await mutateAsync({
      name: values.name.trim(),
      color: values.color,
      description: values.description || undefined,
      parentId: values.parentId,
      taxType: values.taxType || undefined,
      taxRate: values.taxRate ? String(values.taxRate) : undefined,
      taxReportingCode: values.taxReportingCode || undefined,
      excluded: Boolean(values.excluded),
    } as any);
  };

  const flatOptions = useMemo(() => flatten(categories), [categories]);
  const parentOptions: Option[] = useMemo(
    () =>
      flatOptions.map((opt) => ({
        id: opt.id,
        name: `${"\u00A0".repeat(opt.depth * 2)}${opt.name}`,
      })),
    [flatOptions]
  );

  return (
    <Sheet onOpenChange={(o) => onOpenChange(o)} open={open}>
      <SheetContent className="flex flex-col overflow-hidden p-0">
        <div className="flex flex-shrink-0 flex-row items-center justify-between px-6 pt-6 pb-2">
          <h2 className="font-semibold text-base">Create Category</h2>
          <Button
            aria-label="Close"
            className="m-0 size-auto p-0 hover:bg-transparent"
            onClick={() => onOpenChange(false)}
            size="icon"
            variant="ghost"
          >
            <Icons.Close className="size-5" />
          </Button>
        </div>

        <Form {...form}>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="scrollbar-hide flex-1 space-y-4 overflow-y-auto px-6 py-4">
              <FormField
                control={form.control}
                name="name"
                render={() => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-muted-foreground text-xs">Name</FormLabel>
                    <FormControl>
                      <InputColor
                        color={form.watch("color")}
                        name={form.watch("name")}
                        onChange={({ name, color }) => {
                          form.setValue("name", name, { shouldValidate: true });
                          form.setValue("color", color);
                        }}
                        placeholder="Name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-muted-foreground text-xs">
                      Parent Category (Optional)
                    </FormLabel>
                    <FormControl>
                      <Combobox
                        onRemove={() => field.onChange(undefined)}
                        onSelect={(opt) => field.onChange(opt?.id)}
                        options={parentOptions}
                        placeholder="Select parent category"
                        showIcon={false}
                        value={parentOptions.find((o) => o.id === field.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-muted-foreground text-xs">Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Description" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="taxType"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-muted-foreground text-xs">Tax Type</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(v) => field.onChange(v === "none" ? undefined : v)}
                          value={field.value ?? "none"}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select tax type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Custom Tax</SelectItem>
                            <SelectItem value="vat">VAT</SelectItem>
                            <SelectItem value="gst">GST</SelectItem>
                            <SelectItem value="sales_tax">Sales Tax</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxRate"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-muted-foreground text-xs">Tax Rate</FormLabel>
                      <FormControl>
                        <Input
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder="Tax Rate"
                          value={(field.value as any) ?? ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="text-muted-foreground text-xs">
                For unsupported or internal tax logic.
              </div>

              <FormField
                control={form.control}
                name="taxReportingCode"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-muted-foreground text-xs">Report Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Report Code" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="excluded"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <div className="mt-2 border border-border p-3 pt-1.5">
                      <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                          <FormLabel className="text-muted-foreground text-xs">
                            Exclude from Reports
                          </FormLabel>
                          <div className="text-muted-foreground text-xs">
                            Transactions in this category won't appear in financial reports
                          </div>
                        </div>
                        <FormControl>
                          <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                        </FormControl>
                      </div>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="sticky bottom-0 z-10 mt-auto border-t bg-background px-6 py-4">
              <SubmitButton className="w-full" isSubmitting={isPending} type="submit">
                Create
              </SubmitButton>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

// removed dynamic tax helper in favor of Midday-style static copy

function flatten(nodes: CategoryNode[], depth = 0): Array<CategoryNode & { depth: number }> {
  const out: Array<CategoryNode & { depth: number }> = [];
  for (const n of nodes) {
    out.push({ ...n, depth });
    if (n.children && n.children.length > 0) {
      out.push(...flatten(n.children, depth + 1));
    }
  }
  return out;
}
