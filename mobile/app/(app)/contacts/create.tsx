import { useLocalSearchParams } from "expo-router";

import { ResourceForm } from "@/components/refine-ui/resource-form";
import { ContactFormFields } from "@/components/contact/contact-form-fields";

export default function ContactCreateScreen() {
  // Optional ?customerId= preselects the customer (e.g. from a customer screen).
  const { customerId } = useLocalSearchParams<{ customerId?: string }>();
  return (
    <ResourceForm
      resource="contacts"
      action="create"
      title="New contact"
      defaultValues={{ isActive: true, customerId }}
    >
      {(control) => <ContactFormFields control={control} />}
    </ResourceForm>
  );
}
