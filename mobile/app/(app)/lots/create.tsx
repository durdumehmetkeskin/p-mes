import { ResourceForm } from "@/components/refine-ui/resource-form";
import { LotFormFields } from "@/components/lot/lot-form-fields";

export default function LotCreateScreen() {
  return (
    <ResourceForm resource="lots" action="create" title="New lot">
      {(control) => <LotFormFields control={control} />}
    </ResourceForm>
  );
}
