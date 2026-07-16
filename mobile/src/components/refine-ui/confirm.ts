import { Alert } from "react-native";

/**
 * Native confirmation dialog. Resolves the destructive action only if the user
 * confirms. Used for deletes/irreversible actions across the app.
 */
export function confirm({
  title,
  message,
  confirmLabel = "Confirm",
  destructive = false,
  onConfirm,
}: {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    {
      text: confirmLabel,
      style: destructive ? "destructive" : "default",
      onPress: onConfirm,
    },
  ]);
}

export function confirmDelete(name: string, onConfirm: () => void) {
  confirm({
    title: "Delete?",
    message: `Delete “${name}”? This cannot be undone.`,
    confirmLabel: "Delete",
    destructive: true,
    onConfirm,
  });
}
