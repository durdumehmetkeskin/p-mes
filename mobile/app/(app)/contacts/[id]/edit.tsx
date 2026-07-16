import { useLocalSearchParams } from "expo-router";

import { ResourceForm } from "@/components/refine-ui/resource-form";
import { ContactFormFields } from "@/components/contact/contact-form-fields";

export default function ContactEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ResourceForm resource="contacts" action="edit" id={id} title="Edit contact">
      {(control) => <ContactFormFields control={control} />}
    </ResourceForm>
  );
}
