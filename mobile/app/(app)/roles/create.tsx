import { View } from "react-native";

import { ResourceForm } from "@/components/refine-ui/resource-form";
import { TextAreaField, TextField } from "@/components/refine-ui/form";

export default function RoleCreateScreen() {
  return (
    <ResourceForm resource="roles" action="create" title="New role">
      {(control) => (
        <View className="gap-4">
          <TextField
            control={control}
            name="name"
            label="Name"
            placeholder="editor"
            autoCapitalize="none"
            autoCorrect={false}
            rules={{
              required: "Name is required",
              pattern: {
                value: /^[a-z][a-z0-9_-]*$/,
                message: "Lowercase letters, digits, _ or - (start with a letter)",
              },
            }}
          />
          <TextAreaField
            control={control}
            name="description"
            label="Description"
          />
        </View>
      )}
    </ResourceForm>
  );
}
