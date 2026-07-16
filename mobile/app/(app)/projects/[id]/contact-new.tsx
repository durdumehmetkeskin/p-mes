import { useState } from "react";
import { View } from "react-native";
import { type BaseRecord, type HttpError, useCreate } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import type { FieldValues } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { toast } from "sonner-native";

import { FormScreen } from "@/components/refine-ui/form-screen";
import { SwitchField, TextField } from "@/components/refine-ui/form";
import { axiosInstance } from "@/providers/axios";

/**
 * Create a new contact under the project's customer and immediately attach it to
 * the project (mirrors the web "New contact" flow). `companyId` = the customer.
 */
export default function ContactCreateScreen() {
  const { id, companyId } = useLocalSearchParams<{ id: string; companyId?: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { mutate: createContact } = useCreate();
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<BaseRecord, HttpError, FieldValues>({
    defaultValues: { isActive: true },
  });

  const onSubmit = handleSubmit((v) => {
    if (!companyId) {
      toast.error("No customer linked to this project");
      return;
    }
    setSubmitting(true);
    createContact(
      { resource: "contacts", values: { ...v, customerId: companyId } },
      {
        onSuccess: async (data) => {
          try {
            const newId = (data?.data as { id?: string } | undefined)?.id;
            if (newId) {
              await axiosInstance.post(`/projects/${id}/contacts`, {
                contactId: newId,
              });
            }
            qc.invalidateQueries({ queryKey: ["project-contacts", id] });
            qc.invalidateQueries({ queryKey: ["assignable-contacts", id] });
          } finally {
            setSubmitting(false);
            if (router.canGoBack()) router.back();
          }
        },
        onError: () => setSubmitting(false),
      },
    );
  });

  return (
    <FormScreen
      title="New contact"
      submitLabel="Create"
      submitting={submitting}
      onSubmit={onSubmit}
    >
      <View className="gap-4">
        <TextField
          control={control}
          name="firstName"
          label="First name"
          rules={{ required: "First name is required" }}
        />
        <TextField
          control={control}
          name="lastName"
          label="Last name"
          rules={{ required: "Last name is required" }}
        />
        <TextField control={control} name="role" label="Role" />
        <TextField
          control={control}
          name="email"
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextField control={control} name="phone" label="Phone" />
        <SwitchField control={control} name="isActive" label="Active" />
      </View>
    </FormScreen>
  );
}
