import { View } from "react-native";

import { ResourceForm } from "@/components/refine-ui/resource-form";
import { TextField } from "@/components/refine-ui/form";

export default function UserCreateScreen() {
  return (
    <ResourceForm resource="users" action="create" title="New user">
      {(control) => (
        <View className="gap-4">
          <TextField
            control={control}
            name="email"
            label="Email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            rules={{ required: "Email is required" }}
          />
          <TextField
            control={control}
            name="name"
            label="Name"
            rules={{ required: "Name is required" }}
          />
          <TextField
            control={control}
            name="password"
            label="Password"
            secureTextEntry
            rules={{
              required: "Password is required",
              minLength: { value: 8, message: "At least 8 characters" },
            }}
          />
        </View>
      )}
    </ResourceForm>
  );
}
