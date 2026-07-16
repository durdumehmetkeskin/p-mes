import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormValues = Record<string, unknown>;

interface Props {
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
}

export function OrderItemFormFields({ register, errors }: Props) {
  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="sequence">Line #</Label>
          <Input
            id="sequence"
            type="number"
            min="1"
            step="1"
            {...register("sequence", {
              required: "Line number is required",
              valueAsNumber: true,
              min: 1,
            })}
          />
          {errors.sequence && (
            <span className="text-sm text-destructive">
              {String(errors.sequence.message)}
            </span>
          )}
        </div>
        <div className="col-span-3 flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            {...register("name", { required: "Name is required" })}
          />
          {errors.name && (
            <span className="text-sm text-destructive">
              {String(errors.name.message)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} />
      </div>
    </>
  );
}
